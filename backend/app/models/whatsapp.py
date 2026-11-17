from datetime import datetime
import uuid
from typing import Any, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.timezone import now_wita
from app.db.database import Base


class WhatsAppSession(Base):
    """Tracks multi-turn WhatsApp AI ordering conversations per customer phone/chat ID."""
    __tablename__ = "whatsapp_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    phone_number: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    customer_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, default="browsing", nullable=False)
    draft_cart: Mapped[List[dict[str, Any]]] = mapped_column(JSON, default=list)
    delivery_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    selected_provider: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    quoted_delivery_fee: Mapped[float] = mapped_column(Float, default=0.0)
    payment_method: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    conversation_history: Mapped[List[dict[str, Any]]] = mapped_column(JSON, default=list)
    last_order_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_wita, onupdate=now_wita, index=True
    )

    messages: Mapped[List["WhatsAppMessageLog"]] = relationship(
        "WhatsAppMessageLog",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="WhatsAppMessageLog.created_at.asc()",
    )


class WhatsAppMessageLog(Base):
    """Stores inbound and outbound WhatsApp messages for POS visibility and debugging."""
    __tablename__ = "whatsapp_message_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    direction: Mapped[str] = mapped_column(String, nullable=False)  # "inbound" | "outbound"
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    wa_message_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_wita, index=True)

    session: Mapped["WhatsAppSession"] = relationship("WhatsAppSession", back_populates="messages")
