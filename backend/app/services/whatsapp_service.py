import uuid
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import get_settings
from app.core.timezone import now_wita
from app.db.database import SessionLocal
from app.models.orders import OrderSource, OrderType, PaymentMethod, PaymentStatus
from app.models.users import User, UserRole
from app.models.whatsapp import WhatsAppMessageLog, WhatsAppSession
from app.schemas.orders_schema import OrderCreateIn, OrderItemIn
from app.schemas.whatsapp_schema import (
    WhatsAppMessageRead,
    WhatsAppSessionRead,
    WhatsAppSimulateResponse,
)
from app.services.ai_order_service import parse_whatsapp_message_with_ai
from app.services.delivery_service import get_delivery_quotes
from app.services.orders_service import process_checkout


def _normalize_phone(raw: str) -> str:
    """Normalizes phone/chat IDs like '6281234567890@c.us' -> '6281234567890'."""
    return raw.split("@")[0].strip()


def _to_openwa_chat_id(phone: str) -> str:
    clean = _normalize_phone(phone)
    return clean if "@" in phone else f"{clean}@c.us"


def _get_bot_acting_user() -> User:
    """Finds an active manager (or any active staff) to attribute automated WA orders."""
    with SessionLocal() as session:
        manager = (
            session.query(User)
            .filter(User.role == UserRole.MANAGER, User.is_active == True)
            .first()
        )
        if manager:
            return manager
        staff = session.query(User).filter(User.is_active == True).first()
        if not staff:
            raise RuntimeError("No active staff user available to create WhatsApp order")
        return staff


def check_openwa_status() -> dict:
    """Checks whether the configured OpenWA Easy API instance is reachable."""
    settings = get_settings()
    provider = (settings.whatsapp_provider or "openwa").lower()
    base_url = (settings.openwa_base_url or "http://localhost:8080").rstrip("/")

    reachable = False
    detail = "OpenWA Easy API not reachable (simulator still works)"
    if provider == "openwa":
        try:
            headers = {}
            if settings.openwa_api_key:
                headers["api_key"] = settings.openwa_api_key
            resp = httpx.get(f"{base_url}/getHostNumber", headers=headers, timeout=2.5)
            if resp.status_code < 500:
                reachable = True
                detail = "Connected to OpenWA Easy API"
        except Exception as exc:
            detail = f"OpenWA offline ({type(exc).__name__}); using local simulator / waiting for OpenWA"

    return {
        "provider": provider,
        "openwa_base_url": base_url,
        "openwa_connected": reachable,
        "detail": detail,
        "gemini_configured": bool(settings.gemini_api_key),
        "gemini_model": settings.gemini_model,
        "delivery_mode": settings.delivery_provider_mode,
    }


def send_openwa_text(to_phone: str, text: str) -> bool:
    """Sends a text message via OpenWA Easy API (/sendText)."""
    settings = get_settings()
    if (settings.whatsapp_provider or "openwa").lower() != "openwa":
        return False

    base_url = (settings.openwa_base_url or "http://localhost:8080").rstrip("/")
    headers = {"Content-Type": "application/json"}
    if settings.openwa_api_key:
        headers["api_key"] = settings.openwa_api_key

    payload = {
        "args": {
            "to": _to_openwa_chat_id(to_phone),
            "content": text,
        }
    }
    try:
        resp = httpx.post(f"{base_url}/sendText", headers=headers, json=payload, timeout=5.0)
        return resp.status_code < 300
    except Exception as exc:
        print(f"[OpenWA] Send skipped/failed (offline or simulator): {exc}")
        return False


def handle_incoming_whatsapp_message(
    raw_phone: str,
    message_text: str,
    customer_name: Optional[str] = None,
    wa_message_id: Optional[str] = None,
    send_via_openwa: bool = True,
) -> WhatsAppSimulateResponse:
    """
    Core orchestrator for incoming WhatsApp messages (from OpenWA webhook or POS Simulator).
    """
    phone = _normalize_phone(raw_phone)

    with SessionLocal() as session:
        wa_session = (
            session.query(WhatsAppSession)
            .filter(WhatsAppSession.phone_number == phone)
            .first()
        )
        if not wa_session:
            wa_session = WhatsAppSession(
                phone_number=phone,
                customer_name=customer_name or "Pelanggan WA",
                state="browsing",
                draft_cart=[],
                conversation_history=[],
            )
            session.add(wa_session)
            session.commit()
            session.refresh(wa_session)
        elif customer_name and not wa_session.customer_name:
            wa_session.customer_name = customer_name

        # Log inbound message
        session.add(
            WhatsAppMessageLog(
                session_id=wa_session.id,
                direction="inbound",
                message_text=message_text,
                wa_message_id=wa_message_id,
            )
        )
        history = list(wa_session.conversation_history or [])
        history.append({"role": "user", "text": message_text})

        decision = parse_whatsapp_message_with_ai(
            message=message_text,
            customer_name=wa_session.customer_name,
            session_state=wa_session.state,
            current_cart=list(wa_session.draft_cart or []),
            current_address=wa_session.delivery_address,
            current_provider=wa_session.selected_provider,
            history=history,
        )

        # Update session state from AI decision
        if decision.customer_name:
            wa_session.customer_name = decision.customer_name
        if decision.delivery_address:
            wa_session.delivery_address = decision.delivery_address
        if decision.preferred_provider:
            wa_session.selected_provider = decision.preferred_provider
        if decision.payment_method:
            wa_session.payment_method = decision.payment_method

        if decision.intent == "CANCEL":
            wa_session.state = "browsing"
            wa_session.draft_cart = []
            wa_session.delivery_address = None
            wa_session.selected_provider = None
            wa_session.quoted_delivery_fee = 0.0
            final_reply = decision.reply_text
            quotes_payload: List[dict[str, Any]] = []
            created_order_id = None
            daily_num = None
        else:
            if decision.items:
                wa_session.draft_cart = [item.model_dump() for item in decision.items]

            quotes_payload = []
            created_order_id = None
            daily_num = None
            final_reply = decision.reply_text

            if decision.intent == "QUOTE_DELIVERY" and wa_session.delivery_address:
                wa_session.state = "awaiting_confirmation"
                total_qty = sum(int(i.get("quantity", 1)) for i in (wa_session.draft_cart or []))
                quote_res = get_delivery_quotes(wa_session.delivery_address, max(1, total_qty))
                quotes_payload = [q.model_dump() for q in quote_res.quotes]

                chosen = wa_session.selected_provider or "gosend"
                matched_quote = next((q for q in quote_res.quotes if q.provider == chosen), quote_res.quotes[0])
                wa_session.selected_provider = matched_quote.provider
                wa_session.quoted_delivery_fee = matched_quote.fee

                cart_lines = "\n".join(
                    [f"• {i['quantity']}x {i['product_name']}" + (f" ({i['item_notes']})" if i.get("item_notes") else "") for i in wa_session.draft_cart]
                )
                quotes_lines = "\n".join(
                    [f"  - {q.service_name}: Rp {int(q.fee):,}".replace(",", ".") for q in quote_res.quotes]
                )
                final_reply = (
                    f"{decision.reply_text}\n\n"
                    f"*Pesanan:*\n{cart_lines}\n"
                    f"*Alamat:* {wa_session.delivery_address}\n\n"
                    f"*Opsi Pengiriman:*\n{quotes_lines}\n\n"
                    f"Balas *KONFIRMASI* (bisa pilih GoSend / Grab / Ambil Sendiri) untuk langsung kami proses ya!"
                )

            elif decision.intent == "CONFIRM_ORDER" and wa_session.draft_cart:
                provider = wa_session.selected_provider or (
                    "gosend" if wa_session.delivery_address else "self_pickup"
                )
                delivery_fee = 0.0
                if provider != "self_pickup" and wa_session.delivery_address:
                    total_qty = sum(int(i.get("quantity", 1)) for i in wa_session.draft_cart)
                    quote_res = get_delivery_quotes(wa_session.delivery_address, max(1, total_qty))
                    matched_quote = next((q for q in quote_res.quotes if q.provider == provider), quote_res.quotes[0])
                    delivery_fee = matched_quote.fee
                    wa_session.quoted_delivery_fee = delivery_fee

                order_items = [
                    OrderItemIn(
                        product_id=uuid.UUID(i["product_id"]),
                        quantity=int(i.get("quantity", 1)),
                        addon_ids=[uuid.UUID(a) for a in (i.get("addon_ids") or [])],
                        item_notes=i.get("item_notes"),
                    )
                    for i in wa_session.draft_cart
                ]

                order_type = (
                    OrderType.TAKEAWAY if provider == "self_pickup" else OrderType.DELIVERY
                )
                acting_user = _get_bot_acting_user()
                order_payload = OrderCreateIn(
                    items=order_items,
                    payment_method=PaymentMethod(wa_session.payment_method or "qris"),
                    payment_status=PaymentStatus.UNPAID,
                    order_type=order_type,
                    order_source=OrderSource.WHATSAPP,
                    customer_name=wa_session.customer_name or f"WA {phone}",
                    customer_phone=phone,
                    delivery_address=wa_session.delivery_address,
                    delivery_provider=provider,
                    delivery_fee=delivery_fee,
                )
                created_order = process_checkout(order_payload, acting_user)
                created_order_id = created_order.id
                daily_num = created_order.daily_order_number

                wa_session.last_order_id = created_order.id
                wa_session.state = "completed"
                wa_session.draft_cart = []

                total_str = f"Rp {int(created_order.total_amount):,}".replace(",", ".")
                final_reply = (
                    f"Pesanan *#{daily_num or str(created_order.id)[:6]}* diterima! 🎉\n"
                    f"Total: *{total_str}* ({provider.replace('_', ' ').title()})\n"
                    f"Barista kami sedang menyiapkan pesananmu. Terima kasih sudah order di Sukasan Coffee! ☕"
                )
            elif wa_session.draft_cart:
                wa_session.state = "awaiting_address"

        history.append({"role": "assistant", "text": final_reply})
        wa_session.conversation_history = history[-20:]
        wa_session.updated_at = now_wita()

        session.add(
            WhatsAppMessageLog(
                session_id=wa_session.id,
                direction="outbound",
                message_text=final_reply,
            )
        )
        session.commit()
        session.refresh(wa_session)

        if send_via_openwa:
            send_openwa_text(raw_phone, final_reply)

        return WhatsAppSimulateResponse(
            session=WhatsAppSessionRead.model_validate(wa_session),
            reply_text=final_reply,
            intent=decision.intent,
            order_id=created_order_id,
            daily_order_number=daily_num,
            quotes=quotes_payload,
        )


def list_whatsapp_sessions(limit: int = 50) -> List[WhatsAppSessionRead]:
    with SessionLocal() as session:
        rows = (
            session.query(WhatsAppSession)
            .order_by(WhatsAppSession.updated_at.desc())
            .limit(limit)
            .all()
        )
        return [WhatsAppSessionRead.model_validate(r) for r in rows]


def get_whatsapp_session_messages(session_id: uuid.UUID) -> List[WhatsAppMessageRead]:
    with SessionLocal() as session:
        rows = (
            session.query(WhatsAppMessageLog)
            .filter(WhatsAppMessageLog.session_id == session_id)
            .order_by(WhatsAppMessageLog.created_at.asc())
            .all()
        )
        return [WhatsAppMessageRead.model_validate(r) for r in rows]
