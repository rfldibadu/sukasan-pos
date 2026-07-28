from datetime import datetime
import uuid
import enum
from typing import List, Optional
from sqlalchemy import Float, DateTime, ForeignKey, Integer, JSON, String, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from app.db.database import Base

# String-backed enums
class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    QRIS = "qris"
    TRANSFER = "transfer"

class OrderType(str, enum.Enum):
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"

class OrderStatus(str, enum.Enum):
    COMPLETED = "completed"
    VOIDED = "voided"

class Order(Base):
    """Tracks overall customer transactions and net cafe earnings"""
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    
    # Financial Totals (Use Numeric/Decimal for real money instead of Float)
    subtotal_amount: Mapped[float] = mapped_column(Float, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    net_cafe_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Payment Details (native_enum=False keeps database columns as standard VARCHAR)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SQLEnum(PaymentMethod, native_enum=False), default=PaymentMethod.CASH
    )
    cash_amount_received: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_given: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Context & Status
    order_type: Mapped[OrderType] = mapped_column(
        SQLEnum(OrderType, native_enum=False), default=OrderType.DINE_IN
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, native_enum=False), default=OrderStatus.COMPLETED
    )
    void_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Core Metadata (Using timezone-aware standard if needed)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships (Using modern Mapped typing)
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    
    # Pricing Snapshots (Captures exact point-of-sale historic values)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    addons_price: Mapped[float] = mapped_column(Float, default=0.0)
    line_total: Mapped[float] = mapped_column(Float, nullable=False)
    calculated_cafe_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Configurations
    addon_ids: Mapped[List[uuid.UUID]] = mapped_column(JSON, default=list)
    item_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g., "Less ice"

    # String literal prevents circular import/declaration errors
    order: Mapped["Order"] = relationship("Order", back_populates="items")