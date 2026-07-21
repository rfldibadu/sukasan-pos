from pydantic import BaseModel, Field
from typing import Optional

# ==========================================
# RAW STOCK SCHEMAS
# ==========================================
class RawStockBase(BaseModel):
    name: str
    current_quantity: float = Field(..., ge=0)
    unit: str
    cost_per_unit: float = Field(..., ge=0)

class RawStockIn(RawStockBase):
    pass

class RawStockRead(RawStockBase):
    id: int

    class Config:
        from_attributes = True

# ==========================================
# CONSIGNMENT STOCK SCHEMAS
# ==========================================
class ConsignmentStockBase(BaseModel):
    product_id: int
    current_quantity: int = Field(..., ge=0)

class ConsignmentStockIn(ConsignmentStockBase):
    pass

# When updating inventory manually at the end of a shift
class ConsignmentStockUpdate(BaseModel):
    current_quantity: int = Field(..., ge=0)

class ConsignmentStockRead(ConsignmentStockBase):
    id: int

    class Config:
        from_attributes = True