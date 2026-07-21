from fastapi import APIRouter, HTTPException, Query
from app.schemas.orders_schema import OrderCreateIn
from app.services.orders_service import process_checkout, get_recent_orders

router = APIRouter()

@router.post("/checkout")
def create_order(payload: OrderCreateIn):
    try:
        order = process_checkout(payload)
        return {
            "status": "success",
            "message": "Order processed successfully",
            "data": order.model_dump(mode="json")
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
def list_orders(limit: int = Query(20, ge=1, le=100)):
    try:
        orders = get_recent_orders(limit=limit)
        return {
            "status": "success",
            "message": "Fetched recent orders",
            "data": [o.model_dump(mode="json") for o in orders]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))