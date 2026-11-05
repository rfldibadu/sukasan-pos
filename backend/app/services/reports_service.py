from collections import defaultdict
from datetime import datetime, timezone
from typing import List
from sqlalchemy import func, extract
from sqlalchemy.orm import Session, joinedload

from app.models.orders import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.products import Product, ItemType, Vendor
from app.models.stocks import StockPurchase, StockPurchaseItem
from app.models.operationals import OperationalCost
from app.schemas.reports_schema import (
    DashboardReportResponse,
    PaymentMethodBreakdown,
    TopSellingProduct,
    HourlySalesBucket,
    CashflowLedgerEntry,
    DailyCashflowItem,
    MonthlyCashflowItem,
)

INDONESIAN_MONTHS = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
}


def get_dashboard_report(db: Session, start_date: datetime, end_date: datetime) -> DashboardReportResponse:
    # Query orders within date range
    all_orders = (
        db.query(Order)
        .filter(Order.created_at >= start_date, Order.created_at <= end_date)
        .all()
    )

    completed_orders = [o for o in all_orders if o.status == OrderStatus.COMPLETED]
    # Realized revenue comes from non-voided orders that are PAID (or COMPLETED)
    paid_orders = [
        o
        for o in all_orders
        if o.status != OrderStatus.VOIDED
        and (o.payment_status == PaymentStatus.PAID or o.status == OrderStatus.COMPLETED)
    ]
    open_bill_orders = [
        o
        for o in all_orders
        if o.status == OrderStatus.QUEUED and o.payment_status == PaymentStatus.UNPAID
    ]
    voided_count = len([o for o in all_orders if o.status == OrderStatus.VOIDED])

    # 1. Financial Totals (from realized/paid orders)
    gross_sales = sum(o.subtotal_amount for o in paid_orders)
    total_discounts = sum(o.discount_amount for o in paid_orders)
    total_cash_in = sum(o.total_amount for o in paid_orders)
    net_cafe_revenue = sum(o.net_cafe_revenue for o in paid_orders)
    open_bills_amount = sum(o.total_amount for o in open_bill_orders)

    # 2. Consignment Calculations
    consignment_payable = 0.0
    consignment_sales = 0.0
    consignment_fees_earned = 0.0

    paid_order_ids = [o.id for o in paid_orders]
    if paid_order_ids:
        item_details = (
            db.query(OrderItem, Product)
            .join(Product, OrderItem.product_id == Product.id)
            .filter(OrderItem.order_id.in_(paid_order_ids))
            .all()
        )

        for item, product in item_details:
            if product.item_type == ItemType.CONSIGNMENT:
                item_gross = item.unit_price * item.quantity
                fee_earned = (product.consignment_fee or 0.0) * item.quantity
                vendor_payout = item_gross - fee_earned

                consignment_sales += item_gross
                consignment_fees_earned += fee_earned
                consignment_payable += vendor_payout

    # 3. Raw Stock Purchases & Operational Expenses
    raw_stock_expenses = (
        db.query(func.sum(StockPurchase.total_cost))
        .filter(
            StockPurchase.purchased_at >= start_date,
            StockPurchase.purchased_at <= end_date,
        )
        .scalar()
        or 0.0
    )

    operational_expenses = (
        db.query(func.sum(OperationalCost.amount))
        .filter(
            OperationalCost.expense_date >= start_date,
            OperationalCost.expense_date <= end_date,
        )
        .scalar()
        or 0.0
    )

    # 4. Cashflow & Net Profit Calculation
    total_cash_out = float(raw_stock_expenses) + float(operational_expenses)
    net_cashflow = total_cash_in - total_cash_out
    net_profit = net_cafe_revenue - total_cash_out

    # 5. Payment Breakdown
    payment_stats = {}
    for o in paid_orders:
        pm = o.payment_method.value if hasattr(o.payment_method, "value") else str(o.payment_method or "cash")
        if pm not in payment_stats:
            payment_stats[pm] = {"total": 0.0, "count": 0}
        payment_stats[pm]["total"] += o.total_amount
        payment_stats[pm]["count"] += 1

    payment_breakdown = [
        PaymentMethodBreakdown(
            payment_method=pm, total_amount=data["total"], order_count=data["count"]
        )
        for pm, data in payment_stats.items()
    ]

    # 6. Top Selling Products (with enriched category, unit price, and vendor name)
    top_products = []
    if paid_order_ids:
        top_products_query = (
            db.query(
                Product.id,
                Product.name,
                Product.retail_price,
                Product.item_type,
                Product.main_category,
                Vendor.name.label("vendor_name"),
                func.sum(OrderItem.quantity).label("total_qty"),
                func.sum(OrderItem.line_total).label("total_revenue"),
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .outerjoin(Vendor, Product.vendor_id == Vendor.id)
            .filter(OrderItem.order_id.in_(paid_order_ids))
            .group_by(
                Product.id,
                Product.name,
                Product.retail_price,
                Product.item_type,
                Product.main_category,
                Vendor.name,
            )
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5)
            .all()
        )

        top_products = [
            TopSellingProduct(
                product_id=str(row.id),
                product_name=row.name,
                quantity_sold=int(row.total_qty),
                total_revenue=float(row.total_revenue),
                unit_price=float(row.retail_price),
                item_type=row.item_type.value if hasattr(row.item_type, "value") else str(row.item_type),
                main_category=row.main_category.value if hasattr(row.main_category, "value") else (str(row.main_category) if row.main_category else None),
                vendor_name=row.vendor_name,
            )
            for row in top_products_query
        ]

    # 7. Hourly Sales & Traffic Rush (08:00 to 22:00 + any active hours)
    hourly_map = defaultdict(lambda: {"gross_sales": 0.0, "order_count": 0})
    for o in paid_orders:
        hr = o.created_at.hour
        hourly_map[hr]["gross_sales"] += o.total_amount
        hourly_map[hr]["order_count"] += 1

    active_hours = sorted(set(range(8, 16)) | set(hourly_map.keys()))
    max_hourly_sales = max((hourly_map[h]["gross_sales"] for h in active_hours), default=0.0)

    hourly_sales = [
        HourlySalesBucket(
            hour=h,
            hour_label=f"{h:02d}:00",
            gross_sales=hourly_map[h]["gross_sales"],
            order_count=hourly_map[h]["order_count"],
            is_peak=(max_hourly_sales > 0 and hourly_map[h]["gross_sales"] == max_hourly_sales),
        )
        for h in active_hours
    ]

    return DashboardReportResponse(
        start_date=start_date,
        end_date=end_date,
        total_orders_count=len(all_orders),
        completed_orders_count=len(completed_orders),
        paid_orders_count=len(paid_orders),
        open_bills_count=len(open_bill_orders),
        open_bills_amount=open_bills_amount,
        voided_orders_count=voided_count,
        gross_sales=gross_sales,
        total_discounts=total_discounts,
        consignment_sales_total=consignment_sales,
        consignment_payable_to_vendors=consignment_payable,
        consignment_fees_earned=consignment_fees_earned,
        net_cafe_revenue=net_cafe_revenue,
        raw_stock_expenses=float(raw_stock_expenses),
        operational_expenses=float(operational_expenses),
        total_cash_in=total_cash_in,
        total_cash_out=total_cash_out,
        net_cashflow=net_cashflow,
        net_profit=net_profit,
        payment_breakdown=payment_breakdown,
        top_selling_products=top_products,
        hourly_sales=hourly_sales,
    )


def get_daily_cashflow_report(db: Session, month: int, year: int) -> List[DailyCashflowItem]:
    """Matches the 'Rekap Harian' sheet tab: daily Total Masuk, Total Keluar (Stocks + Operationals), and Net Cashflow."""
    orders = (
        db.query(Order)
        .filter(
            extract("month", Order.created_at) == month,
            extract("year", Order.created_at) == year,
            Order.status != OrderStatus.VOIDED,
        )
        .all()
    )
    paid_orders = [
        o for o in orders if o.payment_status == PaymentStatus.PAID or o.status == OrderStatus.COMPLETED
    ]

    stock_purchases = (
        db.query(StockPurchase)
        .filter(
            extract("month", StockPurchase.purchased_at) == month,
            extract("year", StockPurchase.purchased_at) == year,
        )
        .all()
    )

    op_costs = (
        db.query(OperationalCost)
        .filter(
            extract("month", OperationalCost.expense_date) == month,
            extract("year", OperationalCost.expense_date) == year,
        )
        .all()
    )

    daily_map = defaultdict(lambda: {"masuk": 0.0, "stock_keluar": 0.0, "op_keluar": 0.0})

    for o in paid_orders:
        d_str = o.created_at.strftime("%Y-%m-%d")
        daily_map[d_str]["masuk"] += o.total_amount

    for sp in stock_purchases:
        d_str = sp.purchased_at.strftime("%Y-%m-%d")
        daily_map[d_str]["stock_keluar"] += sp.total_cost

    for oc in op_costs:
        d_str = oc.expense_date.strftime("%Y-%m-%d")
        daily_map[d_str]["op_keluar"] += oc.amount

    results: List[DailyCashflowItem] = []
    for d_str in sorted(daily_map.keys()):
        masuk = daily_map[d_str]["masuk"]
        stock_k = daily_map[d_str]["stock_keluar"]
        op_k = daily_map[d_str]["op_keluar"]
        total_k = stock_k + op_k
        results.append(
            DailyCashflowItem(
                date=d_str,
                total_masuk=masuk,
                raw_stock_keluar=stock_k,
                operational_keluar=op_k,
                total_keluar=total_k,
                net_cashflow=masuk - total_k,
            )
        )
    return results


def get_monthly_cashflow_report(db: Session, year: int) -> List[MonthlyCashflowItem]:
    """Matches the 'Rekap Bulanan' sheet tab: monthly Total Masuk, Total Keluar, and Net Cashflow."""
    orders = (
        db.query(Order)
        .filter(
            extract("year", Order.created_at) == year,
            Order.status != OrderStatus.VOIDED,
        )
        .all()
    )
    paid_orders = [
        o for o in orders if o.payment_status == PaymentStatus.PAID or o.status == OrderStatus.COMPLETED
    ]

    stock_purchases = (
        db.query(StockPurchase)
        .filter(extract("year", StockPurchase.purchased_at) == year)
        .all()
    )

    op_costs = (
        db.query(OperationalCost)
        .filter(extract("year", OperationalCost.expense_date) == year)
        .all()
    )

    monthly_map = defaultdict(lambda: {"masuk": 0.0, "stock_keluar": 0.0, "op_keluar": 0.0})

    for o in paid_orders:
        m = o.created_at.month
        monthly_map[m]["masuk"] += o.total_amount

    for sp in stock_purchases:
        m = sp.purchased_at.month
        monthly_map[m]["stock_keluar"] += sp.total_cost

    for oc in op_costs:
        m = oc.expense_date.month
        monthly_map[m]["op_keluar"] += oc.amount

    results: List[MonthlyCashflowItem] = []
    for m in range(1, 13):
        masuk = monthly_map[m]["masuk"]
        stock_k = monthly_map[m]["stock_keluar"]
        op_k = monthly_map[m]["op_keluar"]
        total_k = stock_k + op_k
        results.append(
            MonthlyCashflowItem(
                month=m,
                year=year,
                month_label=f"{INDONESIAN_MONTHS[m]} {year}",
                total_masuk=masuk,
                raw_stock_keluar=stock_k,
                operational_keluar=op_k,
                total_keluar=total_k,
                net_cashflow=masuk - total_k,
            )
        )
    return results


def get_cashflow_ledger(
    db: Session, start_date: datetime, end_date: datetime, limit: int = 200
) -> List[CashflowLedgerEntry]:
    """Matches 'Input Transaksi/Hari': chronological list of Pemasukan (Orders) & Pengeluaran (Raw Stocks + Operationals)."""
    entries: List[CashflowLedgerEntry] = []

    # 1. Pemasukan (Paid Orders)
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status != OrderStatus.VOIDED,
        )
        .all()
    )
    for o in orders:
        if o.payment_status != PaymentStatus.PAID and o.status != OrderStatus.COMPLETED:
            continue
        total_qty = sum(i.quantity for i in o.items) or 1
        entries.append(
            CashflowLedgerEntry(
                id=str(o.id),
                date=o.created_at,
                flow_type="Pemasukan",
                source_type="order",
                title=f"Order #{o.daily_order_number or ''}".strip() + (f" ({o.customer_name})" if o.customer_name else ""),
                category="POS Sales",
                quantity=float(total_qty),
                unit_amount=round(o.total_amount / total_qty, 2),
                total_amount=o.total_amount,
                payment_method=o.payment_method.value if hasattr(o.payment_method, "value") else str(o.payment_method or "cash"),
                notes=o.table_number,
                receipt_image_url=f"/api/receipts/{o.id}/pdf",
            )
        )

    # 2. Pengeluaran: Raw Stock Purchases
    purchases = (
        db.query(StockPurchase)
        .options(joinedload(StockPurchase.items).joinedload(StockPurchaseItem.raw_stock))
        .filter(
            StockPurchase.purchased_at >= start_date,
            StockPurchase.purchased_at <= end_date,
        )
        .all()
    )
    for sp in purchases:
        item_names = ", ".join(
            f"{i.raw_stock.name} ({i.quantity:g} {i.raw_stock.unit})"
            for i in sp.items
            if i.raw_stock
        )
        entries.append(
            CashflowLedgerEntry(
                id=str(sp.id),
                date=sp.purchased_at,
                flow_type="Pengeluaran",
                source_type="raw_stock_purchase",
                title=sp.notes or item_names or "Raw Stock Purchase",
                category="Raw Stock",
                quantity=float(len(sp.items) or 1),
                unit_amount=sp.total_cost,
                total_amount=sp.total_cost,
                payment_method=sp.payment_method.value if hasattr(sp.payment_method, "value") else str(sp.payment_method),
                notes=sp.supplier_or_store or item_names,
                receipt_image_url=sp.receipt_image_url,
            )
        )

    # 3. Pengeluaran: Operational Costs
    op_costs = (
        db.query(OperationalCost)
        .filter(
            OperationalCost.expense_date >= start_date,
            OperationalCost.expense_date <= end_date,
        )
        .all()
    )
    for oc in op_costs:
        entries.append(
            CashflowLedgerEntry(
                id=str(oc.id),
                date=oc.expense_date,
                flow_type="Pengeluaran",
                source_type="operational_cost",
                title=oc.title,
                category=oc.category.value if hasattr(oc.category, "value") else str(oc.category),
                quantity=1.0,
                unit_amount=oc.amount,
                total_amount=oc.amount,
                payment_method=oc.payment_method.value if hasattr(oc.payment_method, "value") else (str(oc.payment_method) if oc.payment_method else None),
                notes=oc.notes,
                receipt_image_url=oc.receipt_image_url,
            )
        )

    def _sort_key(entry: CashflowLedgerEntry) -> float:
        if not entry.date:
            return 0.0
        dt = entry.date if entry.date.tzinfo is not None else entry.date.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    entries.sort(key=_sort_key, reverse=True)
    return entries[:limit]
