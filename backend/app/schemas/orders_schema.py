import uuid

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.models.orders import PaymentMethod, OrderType, OrderStatus

class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1)
    addon_ids: Optional[List[uuid.UUID]] = []
    item_notes: Optional[str] = None

class OrderCreateIn(BaseModel):
    items: List[OrderItemIn]
    payment_method: PaymentMethod = PaymentMethod.CASH
    cash_amount_received: Optional[float] = None
    order_type: OrderType = OrderType.DINE_IN
    customer_name: Optional[str] = None
    discount_amount: float = Field(0.0, ge=0.0)

class OrderItemRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float
    addons_price: float
    line_total: float
    calculated_cafe_revenue: float
    addon_ids: Optional[List[uuid.UUID]] = []
    item_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OrderRead(BaseModel):
    id: uuid.UUID
    subtotal_amount: float
    discount_amount: float
    total_amount: float
    net_cafe_revenue: float
    payment_method: PaymentMethod
    cash_amount_received: Optional[float] = None
    change_given: Optional[float] = None
    order_type: OrderType
    customer_name: Optional[str] = None
    status: OrderStatus
    void_reason: Optional[str] = None
    created_at: datetime
    items: List[OrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)