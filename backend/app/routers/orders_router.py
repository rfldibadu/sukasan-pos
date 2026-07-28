from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.schemas.orders_schema import OrderCreateIn, OrderItemRead, OrderRead
from app.services.orders_service import get_orders_by_date_range, process_checkout, get_recent_orders

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

@router.get("/orders", response_model=list[OrderRead])
def list_orders(
    limit: int = Query(20, ge=1, le=100),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    try:
        if start_date or end_date:
            return get_orders_by_date_range(start_date=start_date, end_date=end_date, limit=limit)
        return get_recent_orders(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))