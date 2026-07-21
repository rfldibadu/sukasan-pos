import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base

class CostCategory(str, enum.Enum):
    ELECTRICITY_INDOOR = "electricity_indoor"
    ELECTRICITY_BOOTH = "electricity_booth"
    STAFF_SALARY = "staff_salary"
    RENT = "rent"
    OTHER = "other"

class OperationalCost(Base):
    """Tracks recurring and one-off operational expenses for monthly P&L calculations"""
    __tablename__ = "operational_costs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True) # e.g. "July Staff Salary - Staff 1"
    category: Mapped[CostCategory] = mapped_column(Enum(CostCategory), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False) # e.g. 1500000.0
    
    # Allows you to filter expenses by month/year
    expense_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)