from datetime import datetime
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import joinedload

from app.db.database import SessionLocal
from app.models.orders import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.products import Product, ItemType
from app.models.stocks import ConsignmentStock
from app.schemas.orders_schema import OrderCreateIn, OrderRead

def process_checkout(order_data: OrderCreateIn) -> OrderRead:
    with SessionLocal() as session:
        if not order_data.items:
            raise HTTPException(status_code=400, detail="Cart cannot be empty")

        subtotal_amount = 0.0
        net_cafe_revenue = 0.0
        db_order_items: list[OrderItem] = []

        for item in order_data.items:
            # 1. Fetch primary product
            product = session.query(Product).filter(
                Product.id == item.product_id, 
                Product.is_active == True
            ).first()
            
            if not product:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Product ID {item.product_id} not found or inactive"
                )

            # 2. Fetch and calculate add-ons total
            addons_total_price = 0.0
            if item.addon_ids:
                addons = session.query(Product).filter(
                    Product.id.in_(item.addon_ids), 
                    Product.is_active == True
                ).all()
                addons_total_price = sum(a.retail_price for a in addons)

            # 3. Line total & subtotal math
            single_unit_price = product.retail_price + addons_total_price
            line_total = single_unit_price * item.quantity
            subtotal_amount += line_total

            # 4. Net revenue split logic
            if product.item_type == ItemType.MAIN:
                item_cafe_revenue = line_total
            else:
                # Consignment item: cafe only keeps consignment_fee * quantity
                fee = product.consignment_fee or 0.0
                item_cafe_revenue = fee * item.quantity

            net_cafe_revenue += item_cafe_revenue

            # 5. Stock deduction for consignment products
            if product.item_type == ItemType.CONSIGNMENT:
                stock_record = session.query(ConsignmentStock).filter(
                    ConsignmentStock.product_id == product.id
                ).first()
                
                if stock_record:
                    if stock_record.current_quantity < item.quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Insufficient stock for '{product.name}'. Remaining: {stock_record.current_quantity}"
                        )
                    stock_record.current_quantity -= item.quantity  # type: ignore

            # 6. Build OrderItem entity
            str_addon_ids = [str(a) for a in (item.addon_ids or [])]
            db_order_items.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.retail_price,
                    addons_price=addons_total_price,
                    line_total=line_total,
                    calculated_cafe_revenue=item_cafe_revenue,
                    addon_ids=str_addon_ids,
                    item_notes=item.item_notes
                )
            )

        # 7. Overall Discount Math
        discount = min(order_data.discount_amount, subtotal_amount)
        final_total = subtotal_amount - discount

        # Adjust net cafe revenue after applying discount
        net_cafe_revenue = max(0.0, net_cafe_revenue - discount)

        # 8. Cash & Change Calculation
        change_given = 0.0
        if order_data.payment_method == PaymentMethod.CASH:
            if order_data.cash_amount_received is None:
                raise HTTPException(
                    status_code=400, 
                    detail="cash_amount_received is required for CASH transactions"
                )
            if order_data.cash_amount_received < final_total:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient cash payment. Needed: {final_total}, Received: {order_data.cash_amount_received}"
                )
            change_given = order_data.cash_amount_received - final_total

        # 9. Create Order
        db_order = Order(
            subtotal_amount=subtotal_amount,
            discount_amount=discount,
            total_amount=final_total,
            net_cafe_revenue=net_cafe_revenue,
            payment_method=order_data.payment_method,
            cash_amount_received=order_data.cash_amount_received,
            change_given=change_given,
            order_type=order_data.order_type,
            customer_name=order_data.customer_name,
            status=OrderStatus.COMPLETED,
            items=db_order_items
        )

        session.add(db_order)
        session.commit()
        session.refresh(db_order)

        return OrderRead.model_validate(db_order)


def void_order(order_id: int, reason: str) -> OrderRead:
    """Cancels an existing order and automatically restores consignment stock levels."""
    with SessionLocal() as session:
        order = session.query(Order).options(
            joinedload(Order.items)
        ).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status == OrderStatus.VOIDED:
            raise HTTPException(status_code=400, detail="Order is already voided")

        # Mark order as voided
        order.status = OrderStatus.VOIDED
        order.void_reason = reason

        # Restore consignment stock for items in this order
        for item in order.items:
            product = session.query(Product).filter(Product.id == item.product_id).first()
            if product and product.item_type == ItemType.CONSIGNMENT:
                stock_record = session.query(ConsignmentStock).filter(
                    ConsignmentStock.product_id == product.id
                ).first()
                if stock_record:
                    stock_record.current_quantity += item.quantity  # type: ignore

        session.commit()
        session.refresh(order)
        return OrderRead.model_validate(order)


def get_recent_orders(limit: int = 20) -> list[OrderRead]:
    with SessionLocal() as session:
        orders = (
            session.query(Order)
            .options(joinedload(Order.items))
            .order_by(Order.created_at.desc())
            .limit(limit)
            .all()
        )
        return [OrderRead.model_validate(o) for o in orders]
    
def get_orders_by_date_range(
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    limit: int = 100
) -> list[OrderRead]:
    with SessionLocal() as session:
        query = session.query(Order).options(joinedload(Order.items))
        
        if start_date:
            query = query.filter(Order.created_at >= start_date)
        if end_date:
            query = query.filter(Order.created_at <= end_date)
            
        orders = query.order_by(Order.created_at.desc()).limit(limit).all()
        return [OrderRead.model_validate(o) for o in orders]