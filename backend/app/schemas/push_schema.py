from typing import Optional
from pydantic import BaseModel


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushKeys
    device_name: Optional[str] = None


class PushUnsubscribeIn(BaseModel):
    endpoint: str


class PushStatusOut(BaseModel):
    is_subscribed: bool
    active_devices_count: int
