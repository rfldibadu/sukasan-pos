from datetime import datetime
from sqlalchemy import Float, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class Order(Base):
    """Tracks overall customer transactions and net cafe earnings"""
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)  # Total customer payment (e.g. 50000)
    net_cafe_revenue: Mapped[float] = mapped_column(Float, nullable=False)  # Total Main Sales + Consignment Fees
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Relationship to order items
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    """Individual line items within a customer order"""
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)


    unit_price: Mapped[float] = mapped_column(Float, nullable=False)  # Historical price snapshot
    addons_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # Total price of any add-ons
    line_total: Mapped[float] = mapped_column(Float, nullable=False)  # Total for this line item (unit_price * quantity + addons_price)s

    addon_ids = mapped_column(JSON, nullable=True, default=[])

    order = relationship("Order", back_populates="items")
    product = relationship("Product")