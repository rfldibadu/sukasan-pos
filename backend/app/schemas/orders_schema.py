from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    addon_ids: Optional[List[int]] = []  # List of Product IDs for add-ons

class OrderCreateIn(BaseModel):
    items: list[OrderItemIn]

class OrderItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    addons_price: float
    line_total: float

    class Config:
        from_attributes = True

class OrderRead(BaseModel):
    id: int
    total_amount: float
    net_cafe_revenue: float
    created_at: datetime
    items: list[OrderItemRead]

    class Config:
        from_attributes = True