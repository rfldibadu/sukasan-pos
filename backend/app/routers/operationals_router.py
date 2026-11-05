from datetime import datetime, UTC
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import require_manager
from app.db.database import get_db
from app.models.operationals import CostCategory
from app.models.stocks import ExpensePaymentMethod
from app.models.users import User
from app.schemas.operationals_schema import OperationalCostIn
from app.services.operationals_service import (
    create_operational_cost,
    list_operational_costs,
    save_operational_receipt_file,
)

router = APIRouter(tags=["Operational Expenses"])


def success_response(data: dict | list, message: str):
    return {"status": "success", "message": message, "data": data}


@router.post("/operational-costs", status_code=status.HTTP_201_CREATED)
def add_operational_cost(
    payload: OperationalCostIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    result = create_operational_cost(db, payload, current_manager=current_manager)
    return success_response(result.model_dump(mode="json"), "Successfully recorded operational expense")


@router.post("/operational-costs/upload", status_code=status.HTTP_201_CREATED)
def add_operational_cost_with_receipt(
    title: str = Form(..., description="e.g., Token Ruko, Listrik Booth, Gaji Wirya, Consignment Rafid"),
    category: CostCategory = Form(...),
    amount: float = Form(..., gt=0),
    payment_method: ExpensePaymentMethod = Form(ExpensePaymentMethod.M_BANKING),
    notes: Optional[str] = Form(None),
    expense_date: Optional[datetime] = Form(None),
    receipt: Optional[UploadFile] = File(None, description="Optional PLN token receipt or transfer screenshot"),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    receipt_url = None
    if receipt and receipt.filename:
        receipt_url = save_operational_receipt_file(receipt, current_manager.id)

    payload = OperationalCostIn(
        title=title,
        category=category,
        amount=amount,
        payment_method=payment_method,
        notes=notes,
        expense_date=expense_date or datetime.now(UTC),
        receipt_image_url=receipt_url,
    )
    result = create_operational_cost(db, payload, current_manager=current_manager)
    return success_response(
        result.model_dump(mode="json"),
        "Successfully recorded operational expense with payment proof",
    )


@router.get("/operational-costs")
def get_operational_costs(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2024),
    category: Optional[CostCategory] = Query(None),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    results = list_operational_costs(db, month=month, year=year, category=category)
    total_expense = sum(c.amount for c in results)

    return {
        "status": "success",
        "message": "Fetched operational expenses",
        "meta": {"total_expense": total_expense, "count": len(results)},
        "data": [c.model_dump(mode="json") for c in results],
    }
