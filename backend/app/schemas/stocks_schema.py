import uuid
from datetime import datetime, UTC
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.stocks import RawStockCategory, ExpensePaymentMethod


# ==========================================
# RAW STOCK CATALOG SCHEMAS
# ==========================================
class RawStockBase(BaseModel):
    name: str = Field(..., min_length=1)
    category: RawStockCategory = RawStockCategory.OTHER
    unit: str = Field(..., min_length=1, description="e.g., gr, kg, ml, liter, pcs, pack, bag")
    current_quantity: float = Field(0.0, ge=0)
    cost_per_unit: float = Field(0.0, ge=0)
    low_stock_threshold: float = Field(0.0, ge=0)


class RawStockIn(RawStockBase):
    pass


class RawStockUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[RawStockCategory] = None
    unit: Optional[str] = None
    current_quantity: Optional[float] = Field(None, ge=0)
    cost_per_unit: Optional[float] = Field(None, ge=0)
    low_stock_threshold: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class RawStockAdjustIn(BaseModel):
    current_quantity: float = Field(..., ge=0, description="New remaining stock quantity after opname/usage")


class RawStockRead(RawStockBase):
    id: uuid.UUID
    is_active: bool
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# RAW STOCK PURCHASE & RECEIPT SCHEMAS
# ==========================================
class StockPurchaseItemIn(BaseModel):
    """Supports referencing an existing RawStock by ID or creating/matching by name on the fly"""
    raw_stock_id: Optional[uuid.UUID] = None
    raw_stock_name: Optional[str] = None
    category: RawStockCategory = RawStockCategory.OTHER
    unit: str = "pcs"
    quantity: float = Field(..., gt=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    subtotal_cost: Optional[float] = Field(None, ge=0)


class StockPurchaseCreateIn(BaseModel):
    supplier_or_store: Optional[str] = None
    payment_method: ExpensePaymentMethod = ExpensePaymentMethod.M_BANKING
    total_cost: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    reimbursement_status: Optional[str] = "not_applicable"
    purchased_at: Optional[datetime] = None
    items: List[StockPurchaseItemIn] = Field(..., min_length=1)


class StockPurchaseItemRead(BaseModel):
    id: uuid.UUID
    raw_stock_id: uuid.UUID
    raw_stock_name: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[RawStockCategory] = None
    quantity: float
    unit_cost: float
    subtotal_cost: float

    model_config = ConfigDict(from_attributes=True)


class StockPurchaseRead(BaseModel):
    id: uuid.UUID
    supplier_or_store: Optional[str] = None
    payment_method: ExpensePaymentMethod
    total_cost: float
    receipt_image_url: Optional[str] = None
    notes: Optional[str] = None
    reimbursement_status: str = "not_applicable"
    reimbursed_at: Optional[datetime] = None
    purchased_at: datetime
    created_by_id: uuid.UUID
    created_by_name: Optional[str] = None
    items: List[StockPurchaseItemRead] = []

    model_config = ConfigDict(from_attributes=True)
