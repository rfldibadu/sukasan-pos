import uuid
import shutil
from datetime import datetime, UTC
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.models.operationals import OperationalCost, CostCategory
from app.models.users import User
from app.schemas.operationals_schema import OperationalCostIn, OperationalCostRead

OPERATIONAL_RECEIPT_DIR = Path("app/static/uploads/receipts/operationals")
OPERATIONAL_RECEIPT_DIR.mkdir(parents=True, exist_ok=True)


def save_operational_receipt_file(file: UploadFile, manager_id: uuid.UUID) -> str:
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/") and content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receipt file must be an image or PDF",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"op_receipt_{manager_id.hex[:8]}_{uuid.uuid4().hex[:10]}.{ext}"
    filepath = OPERATIONAL_RECEIPT_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"/static/uploads/receipts/operationals/{filename}"


def create_operational_cost(
    db: Session,
    data: OperationalCostIn,
    current_manager: Optional[User] = None,
) -> OperationalCostRead:
    db_cost = OperationalCost(
        title=data.title.strip(),
        category=data.category,
        amount=data.amount,
        payment_method=data.payment_method,
        receipt_image_url=data.receipt_image_url,
        expense_date=data.expense_date or datetime.now(UTC),
        notes=data.notes,
        created_by_id=current_manager.id if current_manager else None,
    )

    db.add(db_cost)
    db.commit()
    db.refresh(db_cost)
    return OperationalCostRead.model_validate(db_cost)


def list_operational_costs(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[CostCategory] = None,
) -> List[OperationalCostRead]:
    query = db.query(OperationalCost)

    if month:
        query = query.filter(extract("month", OperationalCost.expense_date) == month)
    if year:
        query = query.filter(extract("year", OperationalCost.expense_date) == year)
    if category:
        query = query.filter(OperationalCost.category == category)

    costs = query.order_by(OperationalCost.expense_date.desc()).all()
    return [OperationalCostRead.model_validate(c) for c in costs]
