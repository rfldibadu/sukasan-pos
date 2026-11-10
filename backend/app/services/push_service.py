import json
import logging
from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.core.vapid import VAPID_INSTANCE, VAPID_PRIVATE_KEY_PEM, VAPID_CLAIM_EMAIL
from app.models.notifications import PushSubscription
from app.models.users import User, UserRole

logger = logging.getLogger("push_notifications")


def send_single_push(db: Session, sub: PushSubscription, payload: dict) -> bool:
    """
    Sends a push notification to a single subscribed device.
    If the endpoint returns 404 or 410 (unregistered or expired), prunes it from DB.
    """
    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh,
            "auth": sub.auth,
        },
    }

    try:
        # Prefer the pre-instantiated Vapid object so pywebpush doesn't fail on PEM parsing
        key = VAPID_INSTANCE if VAPID_INSTANCE is not None else VAPID_PRIVATE_KEY_PEM
        res = webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=key,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
            ttl=86400,  # 24 hours queue retention for offline devices
            headers={"Urgency": "high"},
        )
        status_code = getattr(res, "status_code", 200)
        logger.info(f"[WebPush] Successfully delivered to {sub.device_name or 'device'} ({sub.endpoint[:40]}... status={status_code})")
        return True
    except WebPushException as e:
        status_code = getattr(getattr(e, "response", None), "status_code", None)
        if status_code in (404, 410):
            # Endpoint is dead / unsubscribed by user on device
            logger.info(f"[WebPush] Pruning expired endpoint {sub.endpoint[:40]}... (status {status_code})")
            try:
                db.delete(sub)
                db.commit()
            except Exception:
                db.rollback()
        else:
            logger.warning(f"[WebPush] Failed delivering to {sub.endpoint[:40]}...: {e}")
        return False
    except Exception as e:
        logger.error(f"[WebPush] Unexpected error delivering to {sub.endpoint[:40]}...: {e}")
        return False


def broadcast_push_to_users(db: Session, user_ids: List[uuid.UUID], payload: dict) -> int:
    """Broadcasts a push payload to all devices owned by the given user IDs."""
    if not user_ids:
        return 0

    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id.in_(user_ids))
        .all()
    )

    success_count = 0
    for sub in subscriptions:
        if send_single_push(db, sub, payload):
            success_count += 1

    return success_count


def notify_admins_new_order(order, db: Session):
    """Notifies all active managers when a new POS order or open bill is created."""
    managers = (
        db.query(User)
        .filter(User.role == UserRole.MANAGER, User.is_active == True)
        .all()
    )
    manager_ids = [m.id for m in managers]
    if not manager_ids:
        return

    order_num = getattr(order, "daily_order_number", None) or str(order.id)[:6]
    customer = getattr(order, "customer_name", None) or "Walk-in"
    total_val = int(getattr(order, "total_amount", 0) or 0)
    is_paid = getattr(order, "payment_status", "paid") == "paid"
    status_str = "Paid" if is_paid else "Open Bill"

    payload = {
        "title": f"Sukasan POS: New Order #{order_num}",
        "body": f"{customer} • Rp {total_val:,.0f} ({status_str})".replace(",", "."),
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "url": "/orders",
        "tag": f"order-{order.id}",
    }

    broadcast_push_to_users(db, manager_ids, payload)


def notify_finance_expense(expense_title: str, amount: float, expense_id: str, db: Session):
    """Notifies managers with admin_task == 'finance' when an expense needing reimbursement is created."""
    finance_managers = (
        db.query(User)
        .filter(
            User.role == UserRole.MANAGER,
            User.is_active == True,
            User.admin_task == "finance",
        )
        .all()
    )
    finance_ids = [m.id for m in finance_managers]
    if not finance_ids:
        return

    payload = {
        "title": "Finance Alert: Reimbursement Needed",
        "body": f"Rp {int(amount):,.0f} for '{expense_title}' is waiting for reimbursement".replace(",", "."),
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "url": "/stocks",
        "tag": f"expense-{expense_id}",
    }

    broadcast_push_to_users(db, finance_ids, payload)


def notify_hrd_salary_reminder(cashier_name: str, days_left: int, salary_day: int, db: Session):
    """Notifies managers with admin_task == 'hrd' about upcoming cashier salary dates."""
    hrd_managers = (
        db.query(User)
        .filter(
            User.role == UserRole.MANAGER,
            User.is_active == True,
            User.admin_task == "hrd",
        )
        .all()
    )
    hrd_ids = [m.id for m in hrd_managers]
    if not hrd_ids:
        return

    due_str = "due TODAY!" if days_left == 0 else f"due in {days_left} day(s)"
    payload = {
        "title": "HRD Alert: Cashier Salary Date",
        "body": f"Salary for {cashier_name} is {due_str} (Day {salary_day}th)",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "url": "/users",
        "tag": f"salary-{cashier_name}-{salary_day}",
    }

    broadcast_push_to_users(db, hrd_ids, payload)
