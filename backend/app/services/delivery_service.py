import hashlib
import uuid
from typing import List, Optional
import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.models.orders import Order
from app.schemas.delivery_schema import (
    DeliveryDispatchResponse,
    DeliveryQuoteItem,
    DeliveryQuoteResponse,
)


def _estimate_sandbox_distance_km(address: str) -> float:
    """Deterministic pseudo-distance (1.5 - 8.5 km) based on address string for realistic sandbox quotes."""
    digest = hashlib.md5(address.strip().lower().encode("utf-8")).hexdigest()
    bucket = int(digest[:4], 16) % 70
    return round(1.5 + (bucket / 10.0), 1)


def get_delivery_quotes(destination_address: str, items_count: int = 1) -> DeliveryQuoteResponse:
    """
    Returns GoSend & GrabExpress instant delivery quotes.
    Uses Biteship API when `DELIVERY_PROVIDER_MODE=biteship` and `BITESHIP_API_KEY` is set;
    otherwise uses built-in deterministic Sandbox mode.
    """
    settings = get_settings()
    mode = (settings.delivery_provider_mode or "sandbox").lower()

    if mode == "biteship" and settings.biteship_api_key:
        try:
            payload = {
                "origin_latitude": settings.store_origin_lat,
                "origin_longitude": settings.store_origin_lng,
                "destination_address": destination_address,
                "couriers": "gojek,grab",
                "items": [
                    {
                        "name": "Sukasan Coffee Order",
                        "value": 50000,
                        "weight": max(300, items_count * 350),
                        "quantity": items_count,
                    }
                ],
            }
            resp = httpx.post(
                "https://api.biteship.com/v1/rates/couriers",
                headers={
                    "Authorization": settings.biteship_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=8.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                pricing = data.get("pricing") or []
                quotes: List[DeliveryQuoteItem] = []
                for p in pricing:
                    courier_code = (p.get("courier_code") or "").lower()
                    if courier_code not in ("gojek", "grab"):
                        continue
                    provider_key = "gosend" if courier_code == "gojek" else "grab_express"
                    quotes.append(
                        DeliveryQuoteItem(
                            provider=provider_key,
                            service_name=f"{p.get('courier_name', courier_code.title())} {p.get('courier_service_name', 'Instant')}".strip(),
                            fee=float(p.get("price", 15000)),
                            eta_minutes=25,
                            mode="biteship",
                        )
                    )
                if quotes:
                    quotes.append(
                        DeliveryQuoteItem(
                            provider="self_pickup",
                            service_name="Ambil Sendiri di Toko (Self Pickup)",
                            fee=0.0,
                            eta_minutes=15,
                            mode="biteship",
                        )
                    )
                    return DeliveryQuoteResponse(
                        origin_address=settings.store_origin_address,
                        destination_address=destination_address,
                        quotes=quotes,
                    )
        except Exception as exc:
            print(f"[DeliveryService] Biteship fallback to sandbox: {exc}")

    # Built-in realistic Sandbox quotes (Indonesian instant courier rates)
    km = _estimate_sandbox_distance_km(destination_address)
    gosend_fee = float(round((10000 + km * 2200) / 1000) * 1000)
    grab_fee = float(round((11000 + km * 2100) / 1000) * 1000)

    return DeliveryQuoteResponse(
        origin_address=settings.store_origin_address,
        destination_address=destination_address,
        quotes=[
            DeliveryQuoteItem(
                provider="gosend",
                service_name=f"GoSend Instant (~{km} km)",
                fee=gosend_fee,
                eta_minutes=int(15 + km * 3),
                mode="sandbox",
            ),
            DeliveryQuoteItem(
                provider="grab_express",
                service_name=f"GrabExpress Instant (~{km} km)",
                fee=grab_fee,
                eta_minutes=int(16 + km * 3),
                mode="sandbox",
            ),
            DeliveryQuoteItem(
                provider="self_pickup",
                service_name="Ambil Sendiri di Toko (Self Pickup)",
                fee=0.0,
                eta_minutes=15,
                mode="sandbox",
            ),
        ],
    )


def dispatch_delivery_for_order(
    order_id: uuid.UUID,
    provider_override: Optional[str] = None,
) -> DeliveryDispatchResponse:
    """Books a GoSend or GrabExpress courier for a queued/completed delivery order."""
    settings = get_settings()
    with SessionLocal() as session:
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        provider = (provider_override or order.delivery_provider or "gosend").lower()
        if provider == "self_pickup":
            raise HTTPException(status_code=400, detail="Self-pickup orders do not require courier dispatch")

        prefix = "GS" if provider == "gosend" else "GE"
        tracking_id = f"{prefix}-{str(uuid.uuid4())[:8].upper()}"

        order.delivery_provider = provider
        order.delivery_tracking_id = tracking_id
        order.delivery_status = "searching_driver"
        session.commit()
        session.refresh(order)

        mode = (settings.delivery_provider_mode or "sandbox").lower()
        return DeliveryDispatchResponse(
            order_id=order.id,
            provider=provider,
            tracking_id=tracking_id,
            delivery_status=order.delivery_status,
            tracking_url=f"https://sandbox.sukasan.local/track/{tracking_id}",
            driver_name="Budi Santoso (Sandbox Driver)" if mode == "sandbox" else None,
            driver_phone="0812-0000-8899" if mode == "sandbox" else None,
            mode=mode,
        )


def update_delivery_status(
    status_value: str,
    order_id: Optional[uuid.UUID] = None,
    tracking_id: Optional[str] = None,
) -> dict:
    """Updates order.delivery_status from a courier webhook or sandbox simulator."""
    allowed = {"pending", "searching_driver", "on_delivery", "delivered", "cancelled"}
    normalized = status_value.strip().lower()
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid delivery status. Allowed: {sorted(allowed)}")

    with SessionLocal() as session:
        query = session.query(Order)
        if order_id:
            order = query.filter(Order.id == order_id).first()
        elif tracking_id:
            order = query.filter(Order.delivery_tracking_id == tracking_id).first()
        else:
            raise HTTPException(status_code=400, detail="Either order_id or tracking_id is required")

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        order.delivery_status = normalized
        session.commit()
        return {
            "status": "success",
            "order_id": str(order.id),
            "delivery_tracking_id": order.delivery_tracking_id,
            "delivery_status": order.delivery_status,
        }
