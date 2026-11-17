import uuid
from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.users import User
from app.schemas.delivery_schema import (
    DeliveryDispatchRequest,
    DeliveryDispatchResponse,
    DeliveryQuoteRequest,
    DeliveryQuoteResponse,
    DeliveryWebhookIn,
)
from app.services.delivery_service import (
    dispatch_delivery_for_order,
    get_delivery_quotes,
    update_delivery_status,
)

router = APIRouter(prefix="/delivery", tags=["Delivery (GrabExpress / GoSend)"])


@router.post("/quotes", response_model=DeliveryQuoteResponse)
def quote_delivery(
    payload: DeliveryQuoteRequest,
    current_user: User = Depends(get_current_user),
):
    return get_delivery_quotes(
        destination_address=payload.destination_address,
        items_count=payload.items_count,
    )


@router.post("/orders/{order_id}/dispatch", response_model=DeliveryDispatchResponse)
def dispatch_order_delivery(
    order_id: uuid.UUID,
    payload: DeliveryDispatchRequest,
    current_user: User = Depends(get_current_user),
):
    return dispatch_delivery_for_order(
        order_id=order_id,
        provider_override=payload.provider,
    )


@router.post("/webhook")
def delivery_status_webhook(payload: DeliveryWebhookIn):
    return update_delivery_status(
        status_value=payload.status,
        order_id=payload.order_id,
        tracking_id=payload.tracking_id,
    )
