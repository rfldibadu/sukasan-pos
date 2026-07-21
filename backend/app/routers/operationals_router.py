from fastapi import APIRouter, Query, HTTPException
from app.schemas.operationals_schema import OperationalCostIn
from app.services.operationals_service import create_operational_cost, list_operational_costs

router = APIRouter()

def success_response(data: dict | list, message: str):
    return {"status": "success", "message": message, "data": data}

@router.post("/operational-costs")
def add_operational_cost(payload: OperationalCostIn):
    try:
        result = create_operational_cost(payload)
        return success_response({"id": result.id, "title": result.title}, "Successfully recorded expense")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/operational-costs")
def get_operational_costs(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2024)
):
    try:
        results = list_operational_costs(month=month, year=year)
        total_expense = sum(c.amount for c in results)
        
        return {
            "status": "success",
            "message": "Fetched operational expenses",
            "meta": {"total_expense": total_expense},
            "data": [c.model_dump(mode="json") for c in results]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))