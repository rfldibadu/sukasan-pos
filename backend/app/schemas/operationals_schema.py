from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.operationals import CostCategory

class OperationalCostBase(BaseModel):
    title: str
    category: CostCategory
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None

class OperationalCostIn(OperationalCostBase):
    # Pass an explicit date or default to current time when receiving input
    expense_date: datetime = Field(default_factory=datetime.utcnow)

class OperationalCostRead(OperationalCostBase):
    id: int
    expense_date: datetime

    model_config = ConfigDict(from_attributes=True)