from datetime import datetime
from sqlalchemy import extract
from app.db.database import SessionLocal
from app.models.operationals import OperationalCost
from app.schemas.operationals_schema import OperationalCostIn, OperationalCostRead

def create_operational_cost(data: OperationalCostIn) -> OperationalCostRead:
    with SessionLocal() as session:
        db_cost = OperationalCost(
            title=data.title,
            category=data.category,
            amount=data.amount,
            notes=data.notes
        )
        if data.expense_date:
            db_cost.expense_date = data.expense_date

        session.add(db_cost)
        session.commit()
        session.refresh(db_cost)
        return OperationalCostRead.model_validate(db_cost)

def list_operational_costs(month: int | None = None, year: int | None = None) -> list[OperationalCostRead]:
    with SessionLocal() as session:
        query = session.query(OperationalCost)
        
        # Filter by specific month and year if provided
        if month:
            query = query.filter(extract('month', OperationalCost.expense_date) == month)
        if year:
            query = query.filter(extract('year', OperationalCost.expense_date) == year)
            
        costs = query.all()
        return [OperationalCostRead.model_validate(c) for c in costs]