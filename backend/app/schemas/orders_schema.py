from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderCreateIn(BaseModel):
    items: list[OrderItemIn]

class OrderItemRead(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    calculated_cafe_revenue: float

    model_config = ConfigDict(from_attributes=True)

class OrderRead(BaseModel):
    id: int
    total_amount: float
    net_cafe_revenue: float
    created_at: datetime
    items: list[OrderItemRead]

    model_config = ConfigDict(from_attributes=True)