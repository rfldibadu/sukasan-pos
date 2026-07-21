import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
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

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    contact_info = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationship to cleanly find all products owned by this vendor
    products = relationship("Product", back_populates="vendor")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    item_type = Column(Enum(ItemType), nullable=False)
    retail_price = Column(Float, nullable=False)
    
    main_category = Column(Enum(MainCategory), nullable=True)
    consignment_fee = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Foreign Key tracking for Consignment items
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    
    # Relationship links
    vendor = relationship("Vendor", back_populates="products")