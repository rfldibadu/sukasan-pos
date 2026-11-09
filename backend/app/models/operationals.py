import enum
from datetime import datetime
import uuid
from typing import Optional
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
from app.models.stocks import ExpensePaymentMethod
from app.core.timezone import now_wita
from app.models.users import User


class CostCategory(str, enum.Enum):
    ELECTRICITY_INDOOR = "electricity_indoor"  # Token Ruko / Listrik Ruko
    ELECTRICITY_BOOTH = "electricity_booth"    # Token Booth / Listrik Booth
    STAFF_SALARY = "staff_salary"              # Gaji, Insentif, Kasbon, Pesangon
    CONSIGNMENT_PAYOUT = "consignment_payout"  # Payouts to consignment vendors (Rafid, Letu, Palmer, etc.)
    RENT = "rent"
    OTHER = "other"


class OperationalCost(Base):
    """Tracks recurring and one-off operational expenses for daily/monthly cashflow & P&L calculations"""
    __tablename__ = "operational_costs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    title: Mapped[str] = mapped_column(String, index=True, nullable=False)  # e.g. "Token Ruko", "Gaji Wirya"
    category: Mapped[CostCategory] = mapped_column(
        SQLEnum(CostCategory, native_enum=False, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[Optional[ExpensePaymentMethod]] = mapped_column(
        SQLEnum(ExpensePaymentMethod, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=ExpensePaymentMethod.M_BANKING,
        nullable=True,
    )
    receipt_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Allows filtering expenses by day/month/year
    expense_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_wita, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reimbursement_status: Mapped[str] = mapped_column(
        String, default="not_applicable", nullable=False
    )
    reimbursed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_by = relationship("User")
