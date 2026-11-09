import uuid
import enum
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Enum, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class UserRole(str, enum.Enum):
    MANAGER = "manager"
    CASHIER = "cashier"


class AdminTask(str, enum.Enum):
    FIELD_MANAGER = "field_manager"
    FINANCE = "finance"
    HRD = "hrd"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CASHIER, nullable=False)
    admin_task: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    salary_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
