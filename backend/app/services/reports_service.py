import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import List, Literal
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.timezone import (
    INDONESIAN_DAYS,
    INDONESIAN_MONTHS,
    INDONESIAN_SHORT_MONTHS,
    WITA_TZ,
    get_wita_period_bounds,
    to_wita,
)
from app.models.orders import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.products import Product, ItemType, Vendor
from app.models.stocks import StockPurchase, StockPurchaseItem
from app.models.operationals import OperationalCost
from app.schemas.reports_schema import (
    DashboardReportResponse,
    PaymentMethodBreakdown,
    TopSellingProduct,
    HourlySalesBucket,
    SalesTrendBucket,
    CashflowLedgerEntry,
    DailyCashflowItem,
    MonthlyCashflowItem,
)


def get_dashboard_report(
    db: Session,
    start_date: datetime,
    end_date: datetime,
    period: Literal["today", "week", "month", "year"] = "today",
    period_label: str = "",
) -> DashboardReportResponse:
    wita_start = to_wita(start_date)
    wita_end = to_wita(end_date)

    # Query orders within WITA date range
    all_orders = (
        db.query(Order)
        .filter(Order.created_at >= wita_start, Order.created_at <= wita_end)
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

    # 3. Raw Stock Purchases & Operational Expenses (queried in WITA range)
    period_purchases = (
        db.query(StockPurchase)
        .filter(
            StockPurchase.purchased_at >= wita_start,
            StockPurchase.purchased_at <= wita_end,
        )
        .all()
    )
    raw_stock_expenses = sum(sp.total_cost for sp in period_purchases)

    period_op_costs = (
        db.query(OperationalCost)
        .filter(
            OperationalCost.expense_date >= wita_start,
            OperationalCost.expense_date <= wita_end,
        )
        .all()
    )
    operational_expenses = sum(oc.amount for oc in period_op_costs)

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

    # 7. Hourly Sales & Traffic Rush (in WITA UTC+8)
    hourly_map = defaultdict(lambda: {"gross_sales": 0.0, "order_count": 0})
    for o in paid_orders:
        wita_dt = to_wita(o.created_at)
        hr = wita_dt.hour
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

    # 8. Period-Specific Trend Buckets (today -> hourly, week -> Mon..Sun, month -> days, year -> Jan..Dec)
    trend_buckets: List[SalesTrendBucket] = []

    if period == "today":
        hour_cash_out = defaultdict(float)
        for sp in period_purchases:
            hour_cash_out[to_wita(sp.purchased_at).hour] += sp.total_cost
        for oc in period_op_costs:
            hour_cash_out[to_wita(oc.expense_date).hour] += oc.amount

        for h in active_hours:
            g_in = hourly_map[h]["gross_sales"]
            c_out = hour_cash_out[h]
            trend_buckets.append(
                SalesTrendBucket(
                    label=f"{h:02d}:00",
                    sublabel=f"{h:02d}:00 WITA",
                    gross_sales=g_in,
                    cash_out=c_out,
                    net_cashflow=g_in - c_out,
                    order_count=hourly_map[h]["order_count"],
                    is_peak=(max_hourly_sales > 0 and g_in == max_hourly_sales),
                )
            )

    elif period == "week":
        day_sales = defaultdict(lambda: {"in": 0.0, "out": 0.0, "orders": 0})
        for o in paid_orders:
            d_key = to_wita(o.created_at).date()
            day_sales[d_key]["in"] += o.total_amount
            day_sales[d_key]["orders"] += 1
        for sp in period_purchases:
            day_sales[to_wita(sp.purchased_at).date()]["out"] += sp.total_cost
        for oc in period_op_costs:
            day_sales[to_wita(oc.expense_date).date()]["out"] += oc.amount

        start_day = wita_start.date()
        days_list = [start_day + timedelta(days=i) for i in range(7)]
        max_day_in = max((day_sales[d]["in"] for d in days_list), default=0.0)

        for d in days_list:
            g_in = day_sales[d]["in"]
            c_out = day_sales[d]["out"]
            trend_buckets.append(
                SalesTrendBucket(
                    label=INDONESIAN_DAYS[d.weekday()],
                    sublabel=f"{d.day:02d} {INDONESIAN_SHORT_MONTHS[d.month]}",
                    gross_sales=g_in,
                    cash_out=c_out,
                    net_cashflow=g_in - c_out,
                    order_count=day_sales[d]["orders"],
                    is_peak=(max_day_in > 0 and g_in == max_day_in),
                )
            )

    elif period == "month":
        day_sales = defaultdict(lambda: {"in": 0.0, "out": 0.0, "orders": 0})
        for o in paid_orders:
            d_key = to_wita(o.created_at).date()
            day_sales[d_key]["in"] += o.total_amount
            day_sales[d_key]["orders"] += 1
        for sp in period_purchases:
            day_sales[to_wita(sp.purchased_at).date()]["out"] += sp.total_cost
        for oc in period_op_costs:
            day_sales[to_wita(oc.expense_date).date()]["out"] += oc.amount

        yr = wita_start.year
        mo = wita_start.month
        num_days = calendar.monthrange(yr, mo)[1]
        days_list = [date(yr, mo, day_num) for day_num in range(1, num_days + 1)]
        max_day_in = max((day_sales[d]["in"] for d in days_list), default=0.0)

        for d in days_list:
            g_in = day_sales[d]["in"]
            c_out = day_sales[d]["out"]
            trend_buckets.append(
                SalesTrendBucket(
                    label=f"{d.day:02d}",
                    sublabel=f"{d.day:02d} {INDONESIAN_SHORT_MONTHS[d.month]} {d.year}",
                    gross_sales=g_in,
                    cash_out=c_out,
                    net_cashflow=g_in - c_out,
                    order_count=day_sales[d]["orders"],
                    is_peak=(max_day_in > 0 and g_in == max_day_in),
                )
            )

    else:  # period == "year"
        mo_sales = defaultdict(lambda: {"in": 0.0, "out": 0.0, "orders": 0})
        for o in paid_orders:
            m_key = to_wita(o.created_at).month
            mo_sales[m_key]["in"] += o.total_amount
            mo_sales[m_key]["orders"] += 1
        for sp in period_purchases:
            mo_sales[to_wita(sp.purchased_at).month]["out"] += sp.total_cost
        for oc in period_op_costs:
            mo_sales[to_wita(oc.expense_date).month]["out"] += oc.amount

        yr = wita_start.year
        max_mo_in = max((mo_sales[m]["in"] for m in range(1, 13)), default=0.0)

        for m in range(1, 13):
            g_in = mo_sales[m]["in"]
            c_out = mo_sales[m]["out"]
            trend_buckets.append(
                SalesTrendBucket(
                    label=INDONESIAN_SHORT_MONTHS[m],
                    sublabel=f"{INDONESIAN_MONTHS[m]} {yr}",
                    gross_sales=g_in,
                    cash_out=c_out,
                    net_cashflow=g_in - c_out,
                    order_count=mo_sales[m]["orders"],
                    is_peak=(max_mo_in > 0 and g_in == max_mo_in),
                )
            )

    return DashboardReportResponse(
        period=period,
        period_label=period_label or f"{wita_start.strftime('%Y-%m-%d')} (WITA)",
        timezone="WITA (UTC+8)",
        start_date=wita_start,
        end_date=wita_end,
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
        trend_buckets=trend_buckets,
    )


def get_daily_cashflow_report(db: Session, month: int, year: int) -> List[DailyCashflowItem]:
    """Matches the 'Rekap Harian' sheet tab in WITA (UTC+8): daily Total Masuk, Total Keluar (Stocks + Operationals), and Net Cashflow."""
    m_start, m_end, _ = get_wita_period_bounds("month", date(year, month, 1))

    orders = (
        db.query(Order)
        .filter(
            Order.created_at >= m_start,
            Order.created_at <= m_end,
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
            StockPurchase.purchased_at >= m_start,
            StockPurchase.purchased_at <= m_end,
        )
        .all()
    )

    op_costs = (
        db.query(OperationalCost)
        .filter(
            OperationalCost.expense_date >= m_start,
            OperationalCost.expense_date <= m_end,
        )
        .all()
    )

    daily_map = defaultdict(lambda: {"masuk": 0.0, "stock_keluar": 0.0, "op_keluar": 0.0})

    for o in paid_orders:
        d_str = to_wita(o.created_at).strftime("%Y-%m-%d")
        daily_map[d_str]["masuk"] += o.total_amount

    for sp in stock_purchases:
        d_str = to_wita(sp.purchased_at).strftime("%Y-%m-%d")
        daily_map[d_str]["stock_keluar"] += sp.total_cost

    for oc in op_costs:
        d_str = to_wita(oc.expense_date).strftime("%Y-%m-%d")
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
    """Matches the 'Rekap Bulanan' sheet tab in WITA (UTC+8): monthly Total Masuk, Total Keluar, and Net Cashflow."""
    y_start, y_end, _ = get_wita_period_bounds("year", date(year, 1, 1))

    orders = (
        db.query(Order)
        .filter(
            Order.created_at >= y_start,
            Order.created_at <= y_end,
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
            StockPurchase.purchased_at >= y_start,
            StockPurchase.purchased_at <= y_end,
        )
        .all()
    )

    op_costs = (
        db.query(OperationalCost)
        .filter(
            OperationalCost.expense_date >= y_start,
            OperationalCost.expense_date <= y_end,
        )
        .all()
    )

    monthly_map = defaultdict(lambda: {"masuk": 0.0, "stock_keluar": 0.0, "op_keluar": 0.0})

    for o in paid_orders:
        m = to_wita(o.created_at).month
        monthly_map[m]["masuk"] += o.total_amount

    for sp in stock_purchases:
        m = to_wita(sp.purchased_at).month
        monthly_map[m]["stock_keluar"] += sp.total_cost

    for oc in op_costs:
        m = to_wita(oc.expense_date).month
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
    """Matches 'Input Transaksi/Hari' in WITA (UTC+8): chronological list of Pemasukan (Orders) & Pengeluaran (Raw Stocks + Operationals)."""
    wita_start = to_wita(start_date)
    wita_end = to_wita(end_date)
    entries: List[CashflowLedgerEntry] = []

    # 1. Pemasukan (Paid Orders)
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(
            Order.created_at >= wita_start,
            Order.created_at <= wita_end,
            Order.status != OrderStatus.VOIDED,
        )
        .all()
    )
    for o in orders:
        if o.payment_status != PaymentStatus.PAID and o.status != OrderStatus.COMPLETED:
            continue
        total_qty = sum(i.quantity for i in o.items) or 1
        item_summary = ", ".join(
            f"{i.quantity}x {i.product_name or 'Item'}" for i in o.items
        )
        entries.append(
            CashflowLedgerEntry(
                id=str(o.id),
                date=to_wita(o.created_at),
                flow_type="Pemasukan",
                source_type="order",
                title=item_summary or (f"Order #{o.daily_order_number or ''}".strip()),
                category="POS Sales",
                quantity=float(total_qty),
                unit_amount=round(o.total_amount / total_qty, 2),
                total_amount=o.total_amount,
                payment_method=o.payment_method.value if hasattr(o.payment_method, "value") else str(o.payment_method or "cash"),
                notes=o.customer_name or o.table_number,
                receipt_image_url=f"/api/receipts/{o.id}/pdf",
            )
        )

    # 2. Pengeluaran: Raw Stock Purchases
    purchases = (
        db.query(StockPurchase)
        .options(joinedload(StockPurchase.items).joinedload(StockPurchaseItem.raw_stock))
        .filter(
            StockPurchase.purchased_at >= wita_start,
            StockPurchase.purchased_at <= wita_end,
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
                date=to_wita(sp.purchased_at),
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
            OperationalCost.expense_date >= wita_start,
            OperationalCost.expense_date <= wita_end,
        )
        .all()
    )
    for oc in op_costs:
        entries.append(
            CashflowLedgerEntry(
                id=str(oc.id),
                date=to_wita(oc.expense_date),
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
        dt = to_wita(entry.date)
        return dt.timestamp()

    entries.sort(key=_sort_key, reverse=True)
    return entries[:limit]
