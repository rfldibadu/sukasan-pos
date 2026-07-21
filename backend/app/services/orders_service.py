from fastapi import HTTPException
from app.db.database import SessionLocal
from app.models.orders import Order, OrderItem
from app.models.products import Product, ItemType
from app.models.stocks import ConsignmentStock
from app.schemas.orders_schema import OrderCreateIn, OrderRead

def process_checkout(order_data: OrderCreateIn) -> OrderRead:
    with SessionLocal() as session:
        if not order_data.items:
            raise HTTPException(status_code=400, detail="Cart cannot be empty")

        total_amount = 0.0
        net_cafe_revenue = 0.0
        db_order_items: list[OrderItem] = []

        # Process each cart item safely
        for item in order_data.items:
            product = session.query(Product).filter(Product.id == item.product_id, Product.is_active == True).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found or inactive")

            # 1. Price calculations
            item_total = product.retail_price * item.quantity
            total_amount += item_total

            # 2. Revenue split calculation
            if product.item_type == ItemType.MAIN:
                item_cafe_revenue = item_total
            else:
                # For consignment: revenue is strictly (fee * quantity)
                fee = product.consignment_fee or 0.0
                item_cafe_revenue = fee * item.quantity

            net_cafe_revenue += item_cafe_revenue

            # 3. Deduct consignment stock if applicable
            if product.item_type == ItemType.CONSIGNMENT:
                stock_record = session.query(ConsignmentStock).filter(ConsignmentStock.product_id == product.id).first()
                if stock_record:
                    if stock_record.current_quantity < item.quantity:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Insufficient stock for consignment item '{product.name}'. Remaining: {stock_record.current_quantity}"
                        )
                    stock_record.current_quantity -= item.quantity  # type: ignore

            # 4. Prepare Order Item
            db_order_items.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.retail_price,
                    calculated_cafe_revenue=item_cafe_revenue
                )
            )

        # 5. Save Order & Items atomically
        db_order = Order(
            total_amount=total_amount,
            net_cafe_revenue=net_cafe_revenue,
            items=db_order_items
        )
        session.add(db_order)
        session.commit()
        session.refresh(db_order)

        return OrderRead.model_validate(db_order)

def get_recent_orders(limit: int = 20) -> list[OrderRead]:
    with SessionLocal() as session:
        orders = session.query(Order).order_by(Order.created_at.desc()).limit(limit).all()
        return [OrderRead.model_validate(o) for o in orders]