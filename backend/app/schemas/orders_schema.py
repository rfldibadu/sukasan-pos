import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.orders import PaymentMethod, PaymentStatus, OrderType, OrderStatus

class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1)
    addon_ids: Optional[List[uuid.UUID]] = []
    item_notes: Optional[str] = None

class OrderCreateIn(BaseModel):
    items: List[OrderItemIn]
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    cash_amount_received: Optional[float] = None
    order_type: OrderType = OrderType.DINE_IN
    customer_name: Optional[str] = None
    table_number: Optional[str] = None
    discount_amount: float = Field(0.0, ge=0.0)

class OrderSettleIn(BaseModel):
    payment_method: PaymentMethod
    cash_amount_received: Optional[float] = None
    discount_amount: float = Field(0.0, ge=0.0)

class OrderVoidIn(BaseModel):
    void_reason: str = Field(..., min_length=1)

class OrderAddItemsIn(BaseModel):
    items: List[OrderItemIn]

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
    cashier_id: uuid.UUID
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus
    cash_amount_received: Optional[float] = None
    change_given: Optional[float] = None
    order_type: OrderType
    customer_name: Optional[str] = None
    table_number: Optional[str] = None
    daily_order_number: Optional[int] = None
    status: OrderStatus
    void_reason: Optional[str] = None
    created_at: datetime
    items: List[OrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)
