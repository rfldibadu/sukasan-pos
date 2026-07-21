import enum
from sqlalchemy import String, Float, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class ItemType(str, enum.Enum):
    MAIN = "main"
    CONSIGNMENT = "consignment"

class MainCategory(str, enum.Enum):
    COFFEE = "coffee"
    NON_COFFEE = "non_coffee"
    SNACKS = "snacks"
    ADD_ONS = "add_ons"
    CUSTOM = "custom"

class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    contact_info: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationship to cleanly find all products owned by this vendor
    products: Mapped[list["Product"]] = relationship("Product", back_populates="vendor")

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    item_type: Mapped[ItemType] = mapped_column(SQLEnum(ItemType), nullable=False)
    retail_price: Mapped[float] = mapped_column(Float, nullable=False)
    
    main_category: Mapped[MainCategory | None] = mapped_column(SQLEnum(MainCategory), nullable=True)
    consignment_fee: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Foreign Key tracking for Consignment items
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    # Relationship links
    vendor: Mapped[Vendor | None] = relationship("Vendor", back_populates="products")