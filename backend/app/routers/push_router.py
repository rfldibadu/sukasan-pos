from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.security import require_manager
from app.core.vapid import VAPID_PUBLIC_KEY
from app.db.database import get_db
from app.models.notifications import PushSubscription
from app.models.users import User
from app.schemas.push_schema import PushSubscriptionIn, PushUnsubscribeIn, PushStatusOut
from app.services.push_service import send_single_push

router = APIRouter(prefix="/notifications/push", tags=["Push Notifications"])


@router.get("/public-key")
def get_vapid_public_key(
    current_manager: User = Depends(require_manager),
):
    """Returns the VAPID applicationServerKey for the browser to subscribe."""
    return {"public_key": VAPID_PUBLIC_KEY}


@router.get("/status", response_model=PushStatusOut)
def get_push_status(
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Returns active device subscription status for the current admin."""
    count = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_manager.id)
        .count()
    )
    return PushStatusOut(is_subscribed=count > 0, active_devices_count=count)


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Registers or updates a mobile / browser push subscription for this manager."""
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )

    if existing:
        existing.user_id = current_manager.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.device_name = payload.device_name or existing.device_name
        existing.updated_at = datetime.now(timezone.utc)
    else:
        new_sub = PushSubscription(
            user_id=current_manager.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            device_name=payload.device_name,
        )
        db.add(new_sub)

    db.commit()
    return {"status": "success", "message": "Push notification subscription registered"}


@router.post("/unsubscribe")
def unsubscribe_push(
    payload: PushUnsubscribeIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Removes a push subscription when the user disables push on their device."""
    sub = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_manager.id,
        )
        .first()
    )
    if sub:
        db.delete(sub)
        db.commit()
    return {"status": "success", "message": "Push subscription removed"}


@router.post("/test")
def send_test_push(
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Dispatches a test push notification to all devices registered by the current manager."""
    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_manager.id)
        .all()
    )

    if not subscriptions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No mobile devices are registered for push notifications yet. Please enable push on your device first.",
        )

    task_name = (current_manager.admin_task or "manager").replace("_", " ").title()
    test_payload = {
        "title": f"Sukasan POS Test: {task_name}",
        "body": "Push notifications are working! You will receive updates even when the app is closed.",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "url": "/orders",
        "tag": "sukasan-test-push",
    }

    sent_count = 0
    for sub in subscriptions:
        if send_single_push(db, sub, test_payload):
            sent_count += 1

    if sent_count == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed delivering test push to your {len(subscriptions)} registered device(s). Please try disabling and re-enabling push.",
        )

    return {
        "status": "success",
        "message": f"Sent test push to {sent_count} device(s)",
        "sent_count": sent_count,
        "devices_count": len(subscriptions),
    }
