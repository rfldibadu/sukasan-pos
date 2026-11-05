import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from app.core.timezone import now_wita
from app.models.users import User


class RawStockCategory(str, enum.Enum):
    BEANS = "beans"                          # Arabica / Robusta coffee beans
    MILK_DAIRY = "milk_dairy"                # UHT Indomilk, Ultra, Diamond, Frisian, Oatmilk, Whip cream, Cheese
    CREAMER_SWEETENER = "creamer_sweetener"  # Omela SKM, Carnation, Palm Sugar, Honey
    SYRUP_BEVERAGE = "syrup_beverage"        # Mango/Pandan/Vanilla/Peach syrups, Buavita, Regen, Polaris
    POWDER_SPREAD = "powder_spread"          # Matcha, Red Velvet, Taro, Choco, Biscoff, Ovomaltine, Crumble
    ICE = "ice"                              # Es Kristal / Ice Cubes
    PACKAGING_SUPPLY = "packaging_supply"    # Cups, Straws (Sedotan), Tissues
    OTHER = "other"


class ExpensePaymentMethod(str, enum.Enum):
    CASH = "cash"
    M_BANKING = "m_banking"
    E_WALLET = "e_wallet"
    QRIS = "qris"


class RawStock(Base):
    """Tracks raw ingredients and cafe supplies (beans, milks, syrups, creamer, ice crystals, packaging)"""
    __tablename__ = "raw_stocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    category: Mapped[RawStockCategory] = mapped_column(
        SQLEnum(RawStockCategory, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=RawStockCategory.OTHER,
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "gr", "kg", "ml", "liter", "pcs", "pack", "bag"
    current_quantity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    low_stock_threshold: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_wita,
        onupdate=now_wita,
        nullable=False,
    )

    purchase_items: Mapped[List["StockPurchaseItem"]] = relationship(
        "StockPurchaseItem", back_populates="raw_stock"
    )


class StockPurchase(Base):
    """Records a raw stock purchase (single-item or multi-item receipt) with store receipt or m-banking/e-wallet bill image"""
    __tablename__ = "stock_purchases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    supplier_or_store: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    payment_method: Mapped[ExpensePaymentMethod] = mapped_column(
        SQLEnum(ExpensePaymentMethod, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=ExpensePaymentMethod.M_BANKING,
        nullable=False,
    )
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    receipt_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    purchased_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_wita,
        index=True,
        nullable=False,
    )

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_by = relationship("User")

    items: Mapped[List["StockPurchaseItem"]] = relationship(
        "StockPurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
    )


class StockPurchaseItem(Base):
    """Line item inside a StockPurchase (supports both 1-item and multi-item store receipts)"""
    __tablename__ = "stock_purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stock_purchases.id", ondelete="CASCADE"),
        nullable=False,
    )
    raw_stock_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raw_stocks.id"),
        nullable=False,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False)
    subtotal_cost: Mapped[float] = mapped_column(Float, nullable=False)

    purchase: Mapped["StockPurchase"] = relationship("StockPurchase", back_populates="items")
    raw_stock: Mapped["RawStock"] = relationship("RawStock", back_populates="purchase_items")
