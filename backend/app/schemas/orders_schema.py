import uuid
from datetime import datetime
from typing import List, Literal, Optional
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
    auth_pin: str = Field(..., min_length=4, max_length=6)

class OrderAddItemsIn(BaseModel):
    items: List[OrderItemIn]

class OrderItemRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: Optional[str] = None
    item_type: Optional[str] = None
    vendor_name: Optional[str] = None
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
    cashier_name: Optional[str] = None
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


class OrderCounts(BaseModel):
    queued: int = 0
    completed: int = 0
    voided: int = 0
    all: int = 0


class PaginatedOrdersResponse(BaseModel):
    items: List[OrderRead]
    period: Literal["today", "yesterday", "history"] = "today"
    is_paginated: bool = False
    page: int = 1
    limit: Optional[int] = None
    total_items: int = 0
    total_pages: int = 1
    has_next: bool = False
    has_prev: bool = False
    counts: OrderCounts = Field(default_factory=OrderCounts)
    timezone: str = "WITA (UTC+8)"

