import uuid
import enum
from datetime import UTC, datetime
from sqlalchemy import String, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base

class UserRole(str, enum.Enum):
    MANAGER = "manager"
    CASHIER = "cashier"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CASHIER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))