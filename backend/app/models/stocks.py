import uuid
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class RawStock(Base):
    """Tracks raw ingredients for coffee, non-coffee, and snacks"""
    __tablename__ = "raw_stocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    name: Mapped[str] = mapped_column(String, index=True)
    current_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String)
    cost_per_unit: Mapped[float] = mapped_column(Float)

class ConsignmentStock(Base):
    """Tracks hand-written stock counts for vendor-supplied items"""
    __tablename__ = "consignment_stocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), unique=True)
    current_quantity: Mapped[int] = mapped_column(default=0)

    # Cross-reference relationship back to the products table
    product = relationship("Product")