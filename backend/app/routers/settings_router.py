from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_manager
from app.db.database import get_db
from app.models.settings import AppSetting
from app.models.users import User

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_VOID_PIN = "0852"
VOID_PIN_KEY = "void_pin"


class VoidPinUpdateIn(BaseModel):
    new_pin: str = Field(..., min_length=4, max_length=6)


class VoidPinVerifyIn(BaseModel):
    pin: str = Field(..., min_length=1, max_length=12)


def get_stored_void_pin(db: Session) -> str:
    setting = db.query(AppSetting).filter(AppSetting.key == VOID_PIN_KEY).first()
    if not setting or not setting.value:
        return DEFAULT_VOID_PIN
    return setting.value.strip()


@router.get("/void-pin")
def get_void_pin_meta(
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Returns metadata about the configured Void Authorization PIN (manager-only)."""
    setting = db.query(AppSetting).filter(AppSetting.key == VOID_PIN_KEY).first()
    pin_value = setting.value if setting and setting.value else DEFAULT_VOID_PIN
    return {
        "is_configured": True,
        "pin_length": len(pin_value),
        "updated_at": setting.updated_at.isoformat() if setting else None,
    }


@router.put("/void-pin")
def update_void_pin(
    payload: VoidPinUpdateIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Allows an Admin/Manager to update the Void Authorization PIN (4 to 6 digits)."""
    cleaned_pin = payload.new_pin.strip()
    if not cleaned_pin.isdigit() or not (4 <= len(cleaned_pin) <= 6):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization PIN must be 4 to 6 numeric digits.",
        )

    setting = db.query(AppSetting).filter(AppSetting.key == VOID_PIN_KEY).first()
    if setting:
        setting.value = cleaned_pin
        setting.updated_at = datetime.now(timezone.utc)
    else:
        setting = AppSetting(
            key=VOID_PIN_KEY,
            value=cleaned_pin,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(setting)

    db.commit()
    return {
        "status": "success",
        "message": "Void Authorization PIN updated successfully.",
        "pin_length": len(cleaned_pin),
    }


@router.post("/void-pin/verify")
def verify_void_pin(
    payload: VoidPinVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verifies the provided Void Authorization PIN without executing a void."""
    expected_pin = get_stored_void_pin(db)
    if payload.pin.strip() != expected_pin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid authorization PIN.",
        )
    return {"valid": True}
