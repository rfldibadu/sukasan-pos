import uuid
from datetime import datetime, UTC
from typing import Optional
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.db.database import SessionLocal
from app.models.orders import Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus
from app.models.products import Product, ItemType
from app.models.users import User
from app.schemas.orders_schema import (
    OrderCreateIn, 
    OrderRead, 
    OrderSettleIn, 
    OrderVoidIn, 
    OrderAddItemsIn
)

def process_checkout(order_data: OrderCreateIn, current_user: User) -> OrderRead:
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

            # 5. Direct Stock deduction for tracked items (Consignment or items with explicit stock)
            if product.item_type == ItemType.CONSIGNMENT or product.stock_quantity is not None:
                current_stock = product.stock_quantity or 0
                if current_stock < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for '{product.name}'. Remaining: {current_stock}"
                    )
                product.stock_quantity = current_stock - item.quantity

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
        net_cafe_revenue = max(0.0, net_cafe_revenue - discount)

        # 8. Daily order sequence number calculation (FIFO for today)
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        max_order_num = session.query(func.max(Order.daily_order_number)).filter(
            Order.created_at >= today_start
        ).scalar()
        daily_order_number = (max_order_num or 0) + 1

        # 9. Handle Payment Details
        change_given = 0.0
        order_status = OrderStatus.QUEUED

        if order_data.payment_status == PaymentStatus.PAID:
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
            payment_method = order_data.payment_method
            cash_received = order_data.cash_amount_received
        else:
            # Unpaid / Open Bill
            payment_method = None
            cash_received = None
            change_given = None

        # 10. Create Order
        db_order = Order(
            subtotal_amount=subtotal_amount,
            discount_amount=discount,
            total_amount=final_total,
            net_cafe_revenue=net_cafe_revenue,
            payment_method=payment_method,
            payment_status=order_data.payment_status,
            cash_amount_received=cash_received,
            change_given=change_given,
            order_type=order_data.order_type,
            cashier_id=current_user.id,
            customer_name=order_data.customer_name,
            table_number=order_data.table_number,
            daily_order_number=daily_order_number,
            status=order_status,
            items=db_order_items
        )

        session.add(db_order)
        session.commit()
        session.refresh(db_order)

        return OrderRead.model_validate(db_order)


def settle_order_payment(order_id: uuid.UUID, settle_data: OrderSettleIn) -> OrderRead:
    """Settles payment for an open bill and marks the order as COMPLETED."""
    with SessionLocal() as session:
        order = session.query(Order).options(
            joinedload(Order.items)
        ).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status == OrderStatus.VOIDED:
            raise HTTPException(status_code=400, detail="Cannot settle payment for a voided order")

        if order.status == OrderStatus.COMPLETED and order.payment_status == PaymentStatus.PAID:
            raise HTTPException(status_code=400, detail="Order is already paid and completed")

        # Recalculate discount if updated
        if settle_data.discount_amount > 0:
            discount = min(settle_data.discount_amount, order.subtotal_amount)
            order.discount_amount = discount
            order.total_amount = order.subtotal_amount - discount
            order.net_cafe_revenue = max(0.0, order.net_cafe_revenue - discount)

        # Validate cash tendered
        change_given = 0.0
        if settle_data.payment_method == PaymentMethod.CASH:
            if settle_data.cash_amount_received is None:
                raise HTTPException(
                    status_code=400, 
                    detail="cash_amount_received is required for CASH transactions"
                )
            if settle_data.cash_amount_received < order.total_amount:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient cash payment. Needed: {order.total_amount}, Received: {settle_data.cash_amount_received}"
                )
            change_given = settle_data.cash_amount_received - order.total_amount

        order.payment_method = settle_data.payment_method
        order.payment_status = PaymentStatus.PAID
        order.cash_amount_received = settle_data.cash_amount_received
        order.change_given = change_given
        order.status = OrderStatus.COMPLETED

        session.commit()
        session.refresh(order)
        return OrderRead.model_validate(order)


def add_items_to_order(order_id: uuid.UUID, items_data: OrderAddItemsIn) -> OrderRead:
    """Adds additional items to an existing QUEUED open bill."""
    with SessionLocal() as session:
        order = session.query(Order).options(
            joinedload(Order.items)
        ).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status != OrderStatus.QUEUED:
            raise HTTPException(status_code=400, detail="Can only add items to an active QUEUED order")

        added_subtotal = 0.0
        added_cafe_revenue = 0.0

        for item in items_data.items:
            product = session.query(Product).filter(
                Product.id == item.product_id, 
                Product.is_active == True
            ).first()

            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

            addons_total_price = 0.0
            if item.addon_ids:
                addons = session.query(Product).filter(
                    Product.id.in_(item.addon_ids), 
                    Product.is_active == True
                ).all()
                addons_total_price = sum(a.retail_price for a in addons)

            single_unit_price = product.retail_price + addons_total_price
            line_total = single_unit_price * item.quantity
            added_subtotal += line_total

            if product.item_type == ItemType.MAIN:
                item_cafe_revenue = line_total
            else:
                fee = product.consignment_fee or 0.0
                item_cafe_revenue = fee * item.quantity

            added_cafe_revenue += item_cafe_revenue

            # Deduct stock
            if product.item_type == ItemType.CONSIGNMENT or product.stock_quantity is not None:
                current_stock = product.stock_quantity or 0
                if current_stock < item.quantity:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient stock for '{product.name}'. Remaining: {current_stock}"
                    )
                product.stock_quantity = current_stock - item.quantity

            str_addon_ids = [str(a) for a in (item.addon_ids or [])]
            db_order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.retail_price,
                addons_price=addons_total_price,
                line_total=line_total,
                calculated_cafe_revenue=item_cafe_revenue,
                addon_ids=str_addon_ids,
                item_notes=item.item_notes
            )
            session.add(db_order_item)

        order.subtotal_amount += added_subtotal
        order.total_amount = max(0.0, order.subtotal_amount - order.discount_amount)
        order.net_cafe_revenue += added_cafe_revenue

        session.commit()
        session.refresh(order)
        return OrderRead.model_validate(order)


def void_order(order_id: uuid.UUID, reason: str) -> OrderRead:
    """Cancels an existing order and automatically restores stock levels on Product."""
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

        # Restore product stock for items in this order
        for item in order.items:
            product = session.query(Product).filter(Product.id == item.product_id).first()
            if product and product.stock_quantity is not None:
                product.stock_quantity += item.quantity

        session.commit()
        session.refresh(order)
        return OrderRead.model_validate(order)


def get_order_by_id(order_id: uuid.UUID) -> OrderRead:
    with SessionLocal() as session:
        order = session.query(Order).options(
            joinedload(Order.items)
        ).filter(Order.id == order_id).first()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        return OrderRead.model_validate(order)


def list_orders_service(
    status: Optional[OrderStatus] = None,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> list[OrderRead]:
    with SessionLocal() as session:
        query = session.query(Order).options(joinedload(Order.items))

        if status:
            query = query.filter(Order.status == status)
        if start_date:
            query = query.filter(Order.created_at >= start_date)
        if end_date:
            query = query.filter(Order.created_at <= end_date)

        # FIFO ordering for active QUEUED queue (earliest order first)
        if status == OrderStatus.QUEUED:
            orders = query.order_by(Order.created_at.asc()).limit(limit).all()
        else:
            orders = query.order_by(Order.created_at.desc()).limit(limit).all()

        return [OrderRead.model_validate(o) for o in orders]
