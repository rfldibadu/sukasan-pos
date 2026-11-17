import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class DeliveryQuoteRequest(BaseModel):
    destination_address: str = Field(..., min_length=3)
    items_count: int = Field(1, ge=1)


class DeliveryQuoteItem(BaseModel):
    provider: str  # "gosend" | "grab_express" | "self_pickup"
    service_name: str
    fee: float
    eta_minutes: int
    mode: str  # "sandbox" | "biteship"


class DeliveryQuoteResponse(BaseModel):
    origin_address: str
    destination_address: str
    quotes: List[DeliveryQuoteItem]


class DeliveryDispatchRequest(BaseModel):
    provider: Optional[str] = None  # override order.delivery_provider if needed


class DeliveryDispatchResponse(BaseModel):
    order_id: uuid.UUID
    provider: str
    tracking_id: str
    delivery_status: str
    tracking_url: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    mode: str


class DeliveryWebhookIn(BaseModel):
    order_id: Optional[uuid.UUID] = None
    tracking_id: Optional[str] = None
    status: str = Field(..., description="searching_driver | on_delivery | delivered | cancelled")
