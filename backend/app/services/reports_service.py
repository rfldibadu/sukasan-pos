from datetime import datetime
from typing import Optional
from sqlalchemy import func
from app.db.database import SessionLocal
from app.models.orders import Order, OrderItem, OrderStatus
from app.models.products import Product, ItemType
from app.models.operationals import OperationalCost
from app.schemas.reports_schema import DashboardReportResponse, PaymentMethodBreakdown, TopSellingProduct

def get_dashboard_report(start_date: datetime, end_date: datetime) -> DashboardReportResponse:
    with SessionLocal() as session:
        # Base query for orders within date range (excluding voided for sales totals)
        orders_query = session.query(Order).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date
        )

        all_orders = orders_query.all()
        completed_orders = [o for o in all_orders if o.status == OrderStatus.COMPLETED]
        voided_count = len([o for o in all_orders if o.status == OrderStatus.VOIDED])

        # 1. Financial Totals
        gross_sales = sum(o.subtotal_amount for o in completed_orders)
        total_discounts = sum(o.discount_amount for o in completed_orders)
        net_cafe_revenue = sum(o.net_cafe_revenue for o in completed_orders)

        # 2. Consignment Calculations
        consignment_payable = 0.0
        consignment_sales = 0.0
        consignment_fees_earned = 0.0

        completed_order_ids = [o.id for o in completed_orders]
        if completed_order_ids:
            item_details = (
                session.query(OrderItem, Product)
                .join(Product, OrderItem.product_id == Product.id)
                .filter(OrderItem.order_id.in_(completed_order_ids))
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

        # 3. Operational Expenses
        expenses = session.query(func.sum(OperationalCost.amount)).filter(
            OperationalCost.expense_date >= start_date,
            OperationalCost.expense_date <= end_date
        ).scalar() or 0.0

        # 4. Net Profit Calculation
        net_profit = net_cafe_revenue - expenses

        # 5. Payment Breakdown
        payment_stats = {}
        for o in completed_orders:
            pm = o.payment_method.value if hasattr(o.payment_method, 'value') else str(o.payment_method)
            if pm not in payment_stats:
                payment_stats[pm] = {"total": 0.0, "count": 0}
            payment_stats[pm]["total"] += o.total_amount
            payment_stats[pm]["count"] += 1

        payment_breakdown = [
            PaymentMethodBreakdown(payment_method=pm, total_amount=data["total"], order_count=data["count"])
            for pm, data in payment_stats.items()
        ]

        # 6. Top Selling Products
        top_products_query = (
            session.query(
                Product.id,
                Product.name,
                func.sum(OrderItem.quantity).label("total_qty"),
                func.sum(OrderItem.line_total).label("total_revenue")
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .filter(OrderItem.order_id.in_(completed_order_ids))
            .group_by(Product.id, Product.name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5)
            .all()
        )

        top_products = [
            TopSellingProduct(
                product_id=str(row.id),
                product_name=row.name,
                quantity_sold=int(row.total_qty),
                total_revenue=float(row.total_revenue)
            )
            for row in top_products_query
        ]

        return DashboardReportResponse(
            start_date=start_date,
            end_date=end_date,
            total_orders_count=len(all_orders),
            completed_orders_count=len(completed_orders),
            voided_orders_count=voided_count,
            gross_sales=gross_sales,
            total_discounts=total_discounts,
            consignment_sales_total=consignment_sales,
            consignment_payable_to_vendors=consignment_payable,
            consignment_fees_earned=consignment_fees_earned,
            net_cafe_revenue=net_cafe_revenue,
            operational_expenses=expenses,
            net_profit=net_profit,
            payment_breakdown=payment_breakdown,
            top_selling_products=top_products
        )