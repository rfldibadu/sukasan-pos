from pydantic import BaseModel, Field
from typing import Optional
from app.models.products import ItemType, MainCategory

# ==========================================
# VENDOR SCHEMAS
# ==========================================
class VendorBase(BaseModel):
    name: str
    contact_info: Optional[str] = None

class VendorIn(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# ==========================================
# PRODUCT SCHEMAS
# ==========================================
class ProductBase(BaseModel):
    name: str
    item_type: ItemType
    retail_price: float = Field(..., gt=0)
    main_category: Optional[MainCategory] = None
    consignment_fee: Optional[float] = Field(None, ge=0)
    vendor_id: Optional[int] = None

class ProductIn(ProductBase):
    pass

class ProductRead(ProductBase):
    id: int
    is_active: bool
    # Optional nested data so Next.js can read the vendor object directly if needed
    vendor: Optional[VendorResponse] = None 

    class Config:
        from_attributes = True