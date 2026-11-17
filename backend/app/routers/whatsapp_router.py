import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import get_settings
from app.core.security import get_current_user
from app.models.users import User
from app.schemas.whatsapp_schema import (
    WhatsAppMessageRead,
    WhatsAppSessionRead,
    WhatsAppSimulateIn,
    WhatsAppSimulateResponse,
)
from app.services.whatsapp_service import (
    check_openwa_status,
    get_whatsapp_session_messages,
    handle_incoming_whatsapp_message,
    list_whatsapp_sessions,
)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp AI Ordering"])


@router.get("/status")
def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    return check_openwa_status()


@router.post("/webhook")
async def openwa_webhook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(default=None),
):
    """
    Receives incoming OpenWA (@open-wa/wa-automate) webhook events.
    Expects `event: "onMessage"` (or direct message payload) and ignores group/self messages.
    """
    settings = get_settings()
    if settings.openwa_webhook_secret and x_webhook_secret != settings.openwa_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    payload: dict[str, Any] = await request.json()
    event_name = payload.get("event") or "onMessage"
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    if event_name not in ("onMessage", "onAnyMessage"):
        return {"status": "ignored", "reason": f"event={event_name}"}

    if data.get("fromMe") or data.get("isGroupMsg"):
        return {"status": "ignored", "reason": "self_or_group_message"}

    raw_from = str(data.get("from") or data.get("chatId") or "").strip()
    if not raw_from or raw_from.endswith("@g.us") or raw_from == "status@broadcast":
        return {"status": "ignored", "reason": "non_direct_chat"}

    body = str(data.get("body") or data.get("text") or data.get("caption") or "").strip()
    if not body:
        return {"status": "ignored", "reason": "empty_body"}

    sender = data.get("sender") if isinstance(data.get("sender"), dict) else {}
    push_name = sender.get("pushname") or sender.get("formattedName") or data.get("notifyName")
    msg_id = data.get("id")

    result = handle_incoming_whatsapp_message(
        raw_phone=raw_from,
        message_text=body,
        customer_name=push_name,
        wa_message_id=str(msg_id) if msg_id else None,
        send_via_openwa=True,
    )
    return {
        "status": "processed",
        "intent": result.intent,
        "order_id": str(result.order_id) if result.order_id else None,
        "reply_text": result.reply_text,
    }


@router.post("/simulate", response_model=WhatsAppSimulateResponse)
def simulate_whatsapp_chat(
    payload: WhatsAppSimulateIn,
    current_user: User = Depends(get_current_user),
):
    """Simulates a customer WhatsApp message from the POS UI without needing OpenWA online."""
    return handle_incoming_whatsapp_message(
        raw_phone=payload.phone_number,
        message_text=payload.message,
        customer_name=payload.customer_name,
        send_via_openwa=False,
    )


@router.get("/sessions", response_model=list[WhatsAppSessionRead])
def get_sessions(current_user: User = Depends(get_current_user)):
    return list_whatsapp_sessions()


@router.get("/sessions/{session_id}/messages", response_model=list[WhatsAppMessageRead])
def get_session_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    return get_whatsapp_session_messages(session_id)
