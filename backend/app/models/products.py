import enum
import uuid
from sqlalchemy import String, Float, Boolean, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class ItemType(str, enum.Enum):
    MAIN = "MAIN"
    CONSIGNMENT = "CONSIGNMENT"
    ADD_ON = "ADD_ON"

class MainCategory(str, enum.Enum):
    COFFEE = "COFFEE"
    NON_COFFEE = "NON_COFFEE"
    SNACKS = "SNACKS"
    FOODS = "FOODS"
    CUSTOM = "CUSTOM"

class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    contact_info: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="vendor")

class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    retail_price: Mapped[float] = mapped_column(Float, nullable=False)
    item_type: Mapped[ItemType] = mapped_column(
        SQLEnum(ItemType, values_callable=lambda x: [e.value for e in x]), 
        nullable=False
    )
    main_category: Mapped[MainCategory | None] = mapped_column(
        SQLEnum(MainCategory, values_callable=lambda x: [e.value for e in x]), 
        nullable=True
    )
    consignment_fee: Mapped[float | None] = mapped_column(Float, nullable=True)
    stock_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    vendor: Mapped[Vendor | None] = relationship("Vendor", back_populates="products")