import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.models.users import User
from app.models.orders import OrderStatus
from app.schemas.orders_schema import (
    OrderCreateIn, 
    OrderRead, 
    OrderSettleIn, 
    OrderVoidIn, 
    OrderAddItemsIn,
    PaginatedOrdersResponse,
)
from app.services.orders_service import (
    process_checkout, 
    settle_order_payment, 
    complete_order_service,
    add_items_to_order, 
    void_order, 
    get_order_by_id, 
    list_orders_with_pagination,
)

router = APIRouter()

@router.post("/checkout")
@router.post("/orders")
def create_order(
    payload: OrderCreateIn, 
    current_user: User = Depends(get_current_user)
):
    try:
        order = process_checkout(payload, current_user)
        return {
            "status": "success",
            "message": "Order placed successfully",
            "data": order.model_dump(mode="json")
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", response_model=PaginatedOrdersResponse)
def list_orders(
    period: Literal["today", "yesterday", "history"] = Query(
        "today",
        description="Filter by shift/period in WITA (UTC+8): 'today' and 'yesterday' return all orders unpaginated; 'history' returns paginated results.",
    ),
    status: Optional[OrderStatus] = Query(None, description="Filter by order status (queued, completed, voided)"),
    search: Optional[str] = Query(None, description="Search by customer, table, order #, or item name"),
    page: int = Query(1, ge=1, description="Page number (used when period='history')"),
    limit: int = Query(15, ge=1, le=200, description="Items per page (used when period='history')"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    try:
        return list_orders_with_pagination(
            period=period,
            status=status,
            search=search,
            page=page,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/{order_id}", response_model=OrderRead)
def get_single_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
):
    try:
        return get_order_by_id(order_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/settle", response_model=OrderRead)
def settle_order(
    order_id: uuid.UUID,
    payload: OrderSettleIn,
    current_user: User = Depends(get_current_user)
):
    try:
        return settle_order_payment(order_id, payload)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/complete", response_model=OrderRead)
def complete_order_route(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user)
):
    try:
        return complete_order_service(order_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/void", response_model=OrderRead)
def void_order_route(
    order_id: uuid.UUID,
    payload: OrderVoidIn,
    current_user: User = Depends(get_current_user)
):
    try:
        return void_order(order_id, payload.void_reason)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/items", response_model=OrderRead)
def add_items_to_order_route(
    order_id: uuid.UUID,
    payload: OrderAddItemsIn,
    current_user: User = Depends(get_current_user)
):
    try:
        return add_items_to_order(order_id, payload)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
