import json
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.models.products import ItemType, Product


class ParsedOrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(1, ge=1)
    addon_ids: List[str] = Field(default_factory=list)
    item_notes: Optional[str] = None


class AIOrderDecision(BaseModel):
    intent: str = "CHAT"  # CHAT | UPDATE_CART | QUOTE_DELIVERY | CONFIRM_ORDER | CANCEL
    reply_text: str
    items: List[ParsedOrderItem] = Field(default_factory=list)
    customer_name: Optional[str] = None
    delivery_address: Optional[str] = None
    preferred_provider: Optional[str] = None  # gosend | grab_express | self_pickup
    payment_method: Optional[str] = None  # qris | transfer | cash


def _load_menu_context() -> tuple[List[dict[str, Any]], List[dict[str, Any]]]:
    """Loads active menu items and add-ons from PostgreSQL."""
    with SessionLocal() as session:
        products = session.query(Product).filter(Product.is_active == True).all()
        mains: List[dict[str, Any]] = []
        addons: List[dict[str, Any]] = []
        for p in products:
            entry = {
                "id": str(p.id),
                "name": p.name,
                "price": int(p.retail_price),
                "category": p.main_category.value if p.main_category else p.item_type.value,
                "stock": p.stock_quantity,
            }
            if p.item_type == ItemType.ADD_ON:
                addons.append(entry)
            else:
                mains.append(entry)
        return mains, addons


def _fallback_parse(
    message: str,
    mains: List[dict[str, Any]],
    current_cart: List[dict[str, Any]],
    current_address: Optional[str],
    current_provider: Optional[str],
) -> AIOrderDecision:
    """Deterministic fallback parser when GEMINI_API_KEY is not configured or unavailable."""
    lower = message.strip().lower()

    if any(w in lower for w in ("batal", "cancel", "gak jadi", "ga jadi")):
        return AIOrderDecision(
            intent="CANCEL",
            reply_text="Baik, pesanan dibatalkan. Kalau mau pesan lagi tinggal chat di sini ya! ☕",
            items=[],
        )

    # Detect confirmation
    is_confirm = any(w in lower for w in ("konfirmasi", "confirm", "oke pesan", "jadi pesan", "gas", "deal"))
    provider = current_provider
    if "gosend" in lower or "gojek" in lower:
        provider = "gosend"
    elif "grab" in lower:
        provider = "grab_express"
    elif "pickup" in lower or "ambil sendiri" in lower:
        provider = "self_pickup"

    payment = "qris"
    if "transfer" in lower or "bca" in lower:
        payment = "transfer"
    elif "cash" in lower or "tunai" in lower or "cod" in lower:
        payment = "cash"

    # Extract address if user mentions "kirim ke" or "alamat"
    address = current_address
    addr_match = re.search(r"(?:kirim\s*ke|alamat(?:\s*:|\s+di)?)\s+(.+?)(?:,?\s*(?:pakai|via|bayar|konfirmasi)|$)", message, re.IGNORECASE)
    if addr_match:
        address = addr_match.group(1).strip(" ,.")

    # Match menu items
    matched_items: List[ParsedOrderItem] = []
    for m in mains:
        name_lower = m["name"].lower()
        if name_lower in lower:
            qty_match = re.search(rf"(\d+)\s*(?:x\s*)?{re.escape(name_lower)}", lower)
            qty = int(qty_match.group(1)) if qty_match else 1
            notes = "less ice" if "less ice" in lower else ("less sugar" if "less sugar" in lower else None)
            matched_items.append(
                ParsedOrderItem(
                    product_id=m["id"],
                    product_name=m["name"],
                    quantity=max(1, qty),
                    item_notes=notes,
                )
            )

    items_to_use = matched_items if matched_items else [
        ParsedOrderItem(**item) for item in current_cart if isinstance(item, dict) and item.get("product_id")
    ]

    if is_confirm and items_to_use:
        return AIOrderDecision(
            intent="CONFIRM_ORDER",
            reply_text="Siap! Pesanan sedang diproses oleh barista Sukasan Coffee.",
            items=items_to_use,
            delivery_address=address,
            preferred_provider=provider or ("gosend" if address else "self_pickup"),
            payment_method=payment,
        )

    if items_to_use and address:
        return AIOrderDecision(
            intent="QUOTE_DELIVERY",
            reply_text="Berikut ringkasan pesanan & estimasi ongkirnya:",
            items=items_to_use,
            delivery_address=address,
            preferred_provider=provider,
            payment_method=payment,
        )

    if items_to_use:
        summary = ", ".join([f"{i.quantity}x {i.product_name}" for i in items_to_use])
        return AIOrderDecision(
            intent="UPDATE_CART",
            reply_text=(
                f"Catat! Keranjang kamu: {summary}.\n"
                "Mau dikirim ke alamat mana? (atau ketik *ambil sendiri* untuk pickup di toko)"
            ),
            items=items_to_use,
            delivery_address=address,
            preferred_provider=provider,
        )

    top_menu = "\n".join([f"• {m['name']} — Rp {m['price']:,}".replace(",", ".") for m in mains[:8]])
    return AIOrderDecision(
        intent="CHAT",
        reply_text=(
            "Halo! Selamat datang di *Sukasan Coffee* ☕\n"
            "Mau pesan apa hari ini? Ini beberapa menu favorit kami:\n"
            f"{top_menu}\n\n"
            "Contoh pesan: _2 Es Kopi Susu less ice, kirim ke Jl. Teuku Umar No. 10_"
        ),
        items=[],
    )


def parse_whatsapp_message_with_ai(
    message: str,
    customer_name: Optional[str],
    session_state: str,
    current_cart: List[dict[str, Any]],
    current_address: Optional[str],
    current_provider: Optional[str],
    history: List[dict[str, Any]],
) -> AIOrderDecision:
    """
    Uses Google Gemini (`gemini-2.5-flash` free tier) to understand natural-language
    WhatsApp orders against the live Sukasan menu. Falls back gracefully if no API key is set.
    """
    settings = get_settings()
    mains, addons = _load_menu_context()

    if not settings.gemini_api_key:
        return _fallback_parse(message, mains, current_cart, current_address, current_provider)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        system_prompt = f"""
You are Sukasan Coffee's friendly WhatsApp Order Assistant (Indonesian & English).
Your job is to help customers order from our LIVE MENU, collect their delivery address (or self-pickup preference), let them choose GoSend / GrabExpress / Self Pickup, and confirm their order.

LIVE MENU ITEMS (use exact `id` and `name`):
{json.dumps(mains, ensure_ascii=False)}

AVAILABLE ADD-ONS (use exact `id`):
{json.dumps(addons, ensure_ascii=False)}

CURRENT SESSION CONTEXT:
- Customer Name: {customer_name or "Pelanggan"}
- Session State: {session_state}
- Current Draft Cart: {json.dumps(current_cart, ensure_ascii=False)}
- Current Delivery Address: {current_address or "None"}
- Selected Courier: {current_provider or "None"}

RULES:
1. Only match products from LIVE MENU ITEMS. Never invent product IDs or prices.
2. Preserve existing items in Current Draft Cart unless the customer replaces, removes, or cancels them.
3. Intent selection:
   - "CANCEL": user cancels the order.
   - "CONFIRM_ORDER": user explicitly confirms (e.g. "konfirmasi", "iya pesan", "ok gas", "deal") AND cart is non-empty AND (delivery_address is set OR preferred_provider == "self_pickup").
   - "QUOTE_DELIVERY": cart is non-empty AND delivery_address is provided (and not yet confirmed).
   - "UPDATE_CART": cart changed or items added, still missing delivery address / pickup choice.
   - "CHAT": greeting, menu inquiry, or unclear request.
4. Keep `reply_text` concise, warm, and WhatsApp-friendly (use `*bold*` sparingly).
5. Always return valid JSON matching the schema.
"""

        recent_turns = history[-6:] if history else []
        conversation_blob = "\n".join(
            [f"{t.get('role', 'user').upper()}: {t.get('text', '')}" for t in recent_turns]
        )
        user_prompt = f"RECENT CHAT:\n{conversation_blob}\n\nNEW CUSTOMER MESSAGE:\n{message}"

        response = client.models.generate_content(
            model=settings.gemini_model or "gemini-2.5-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=AIOrderDecision,
                temperature=0.2,
            ),
        )

        raw_text = (response.text or "").strip()
        if raw_text:
            return AIOrderDecision.model_validate_json(raw_text)
    except Exception as exc:
        print(f"[AIOrderService] Gemini fallback triggered: {exc}")

    return _fallback_parse(message, mains, current_cart, current_address, current_provider)
