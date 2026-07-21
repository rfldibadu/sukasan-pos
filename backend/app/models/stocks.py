from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class RawStock(Base):
    """Tracks raw ingredients for coffee, non-coffee, and snacks"""
    __tablename__ = "raw_stocks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    current_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String)
    cost_per_unit: Mapped[float] = mapped_column(Float)

class ConsignmentStock(Base):
    """Tracks hand-written stock counts for vendor-supplied items"""
    __tablename__ = "consignment_stocks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), unique=True)
    current_quantity: Mapped[int] = mapped_column(default=0)

    # Cross-reference relationship back to the products table
    product = relationship("Product")