import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_manager
from app.db.database import get_db
from app.models.stocks import RawStockCategory, ExpensePaymentMethod
from app.models.users import User
from app.schemas.stocks_schema import (
    RawStockIn,
    RawStockUpdate,
    RawStockAdjustIn,
    StockPurchaseCreateIn,
    StockPurchaseItemIn,
)
from app.services.stocks_service import (
    create_raw_stock,
    list_raw_stocks,
    update_raw_stock,
    adjust_raw_stock_quantity,
    save_stock_receipt_file,
    record_stock_purchase,
    list_stock_purchases,
)

router = APIRouter(tags=["Raw Stocks & Purchases"])


def success_response(data: dict | list, message: str, meta: dict | None = None):
    resp = {"status": "success", "message": message, "data": data}
    if meta is not None:
        resp["meta"] = meta
    return resp


# ==========================================
# RAW STOCK CATALOG ENDPOINTS
# ==========================================
@router.get("/stocks/raw")
def get_raw_stocks(
    category: Optional[RawStockCategory] = Query(None, description="Filter by raw stock category"),
    include_inactive: bool = Query(False),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    results = list_raw_stocks(db, category=category, include_inactive=include_inactive)
    serialized = [r.model_dump(mode="json") for r in results]
    low_stock_count = sum(
        1 for r in results if r.current_quantity <= r.low_stock_threshold
    )
    return success_response(
        serialized,
        "Fetched raw stock levels",
        meta={"total_items": len(serialized), "low_stock_count": low_stock_count},
    )


@router.post("/stocks/raw", status_code=status.HTTP_201_CREATED)
def add_raw_stock(
    payload: RawStockIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    result = create_raw_stock(db, payload)
    return success_response(result.model_dump(mode="json"), "Successfully added raw stock item")


@router.patch("/stocks/raw/{stock_id}")
def edit_raw_stock(
    stock_id: uuid.UUID,
    payload: RawStockUpdate,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    result = update_raw_stock(db, stock_id, payload)
    return success_response(result.model_dump(mode="json"), "Updated raw stock item")


@router.patch("/stocks/raw/{stock_id}/adjust")
def adjust_raw_stock(
    stock_id: uuid.UUID,
    payload: RawStockAdjustIn,
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    result = adjust_raw_stock_quantity(db, stock_id, payload.current_quantity)
    return success_response(result.model_dump(mode="json"), "Adjusted raw stock quantity")


# ==========================================
# RAW STOCK PURCHASES (WITH OPTIONAL RECEIPT / BILL UPLOAD)
# ==========================================
@router.post("/stocks/purchases", status_code=status.HTTP_201_CREATED)
def add_stock_purchase_with_receipt(
    receipt: Optional[UploadFile] = File(None, description="Optional store receipt photo or m-banking/e-wallet payment bill image"),
    payment_method: ExpensePaymentMethod = Form(ExpensePaymentMethod.M_BANKING),
    supplier_or_store: Optional[str] = Form(None),
    total_cost: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    purchased_at: Optional[datetime] = Form(None),
    # Option A: Multi-item receipt passed as a JSON string of StockPurchaseItemIn[]
    items_json: Optional[str] = Form(
        None,
        description='JSON array for multi-item receipts, e.g. [{"raw_stock_name":"Cup","category":"packaging_supply","unit":"pcs","quantity":500,"subtotal_cost":200000}]',
    ),
    # Option B: Single-item receipt shorthand fields
    raw_stock_id: Optional[uuid.UUID] = Form(None),
    raw_stock_name: Optional[str] = Form(None),
    category: RawStockCategory = Form(RawStockCategory.OTHER),
    unit: str = Form("pcs"),
    quantity: Optional[float] = Form(None),
    unit_cost: Optional[float] = Form(None),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Manager-only endpoint to log a raw stock purchase with an optional store receipt
    or m-banking / e-wallet payment screenshot.
    Supports both single-item purchases (via direct form fields) and multi-item store receipts (via items_json).
    """
    parsed_items: list[StockPurchaseItemIn] = []

    if items_json:
        try:
            raw_list = json.loads(items_json)
            if not isinstance(raw_list, list) or len(raw_list) == 0:
                raise ValueError("items_json must be a non-empty JSON array")
            parsed_items = [StockPurchaseItemIn(**item) for item in raw_list]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid items_json format: {str(e)}",
            )
    else:
        if not raw_stock_id and not raw_stock_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide either items_json (for multi-item receipts) or raw_stock_id / raw_stock_name (for single-item receipts)",
            )
        if quantity is None or quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quantity (> 0) is required for single-item purchase",
            )
        parsed_items = [
            StockPurchaseItemIn(
                raw_stock_id=raw_stock_id,
                raw_stock_name=raw_stock_name,
                category=category,
                unit=unit,
                quantity=quantity,
                unit_cost=unit_cost,
                subtotal_cost=total_cost,
            )
        ]

    receipt_url = None
    if receipt and receipt.filename:
        receipt_url = save_stock_receipt_file(receipt, current_manager.id)

    purchase_in = StockPurchaseCreateIn(
        supplier_or_store=supplier_or_store,
        payment_method=payment_method,
        total_cost=total_cost,
        notes=notes,
        purchased_at=purchased_at,
        items=parsed_items,
    )

    result = record_stock_purchase(db, purchase_in, receipt_url, current_manager)
    return success_response(
        result.model_dump(mode="json"),
        "Successfully recorded raw stock purchase",
    )


@router.get("/stocks/purchases")
def get_stock_purchases(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2024),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_manager: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    results = list_stock_purchases(
        db,
        month=month,
        year=year,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    total_spent = sum(p.total_cost for p in results)
    return success_response(
        [p.model_dump(mode="json") for p in results],
        "Fetched raw stock purchase history",
        meta={"total_purchases": len(results), "total_spent": total_spent},
    )
