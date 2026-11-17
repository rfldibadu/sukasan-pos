import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WhatsAppSimulateIn(BaseModel):
    phone_number: str = Field(..., min_length=4, description="Simulated customer phone or chat ID, e.g. 6281234567890")
    customer_name: Optional[str] = "Pelanggan WA"
    message: str = Field(..., min_length=1)


class WhatsAppMessageRead(BaseModel):
    id: uuid.UUID
    direction: str
    message_text: str
    wa_message_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WhatsAppSessionRead(BaseModel):
    id: uuid.UUID
    phone_number: str
    customer_name: Optional[str] = None
    state: str
    draft_cart: List[dict[str, Any]] = []
    delivery_address: Optional[str] = None
    selected_provider: Optional[str] = None
    quoted_delivery_fee: float = 0.0
    payment_method: Optional[str] = None
    last_order_id: Optional[uuid.UUID] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WhatsAppSimulateResponse(BaseModel):
    session: WhatsAppSessionRead
    reply_text: str
    intent: str
    order_id: Optional[uuid.UUID] = None
    daily_order_number: Optional[int] = None
    quotes: List[dict[str, Any]] = []
