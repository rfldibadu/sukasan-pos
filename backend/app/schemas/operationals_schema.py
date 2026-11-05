import uuid
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, UTC
from app.models.operationals import CostCategory
from app.models.stocks import ExpensePaymentMethod


class OperationalCostBase(BaseModel):
    title: str = Field(..., min_length=1)
    category: CostCategory
    amount: float = Field(..., gt=0)
    payment_method: Optional[ExpensePaymentMethod] = ExpensePaymentMethod.M_BANKING
    notes: Optional[str] = None


class OperationalCostIn(OperationalCostBase):
    expense_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    receipt_image_url: Optional[str] = None


class OperationalCostRead(OperationalCostBase):
    id: uuid.UUID
    expense_date: datetime
    receipt_image_url: Optional[str] = None
    created_by_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)
