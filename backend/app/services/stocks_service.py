import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload
from app.core.timezone import now_wita, to_wita

from app.models.stocks import (
    RawStock,
    RawStockCategory,
    StockPurchase,
    StockPurchaseItem,
    ExpensePaymentMethod,
)
from app.models.users import User
from app.services.push_service import notify_finance_expense
from app.schemas.stocks_schema import (
    RawStockIn,
    RawStockUpdate,
    RawStockRead,
    StockPurchaseCreateIn,
    StockPurchaseRead,
    StockPurchaseItemRead,
)

STOCK_RECEIPT_DIR = Path("app/static/uploads/receipts/stocks")
STOCK_RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_RECEIPT_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
}


def save_stock_receipt_file(file: UploadFile, manager_id: uuid.UUID) -> str:
    """Validates and saves a store receipt or m-banking/e-wallet payment proof image."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_RECEIPT_MIME_TYPES and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receipt file must be an image (JPG, PNG, WEBP) or PDF",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"stock_receipt_{manager_id.hex[:8]}_{uuid.uuid4().hex[:10]}.{ext}"
    filepath = STOCK_RECEIPT_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"/static/uploads/receipts/stocks/{filename}"


# ==========================================
# RAW STOCK CATALOG SERVICES
# ==========================================
def create_raw_stock(db: Session, data: RawStockIn) -> RawStockRead:
    existing = db.query(RawStock).filter(RawStock.name.ilike(data.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Raw stock '{data.name}' already exists",
        )

    db_raw = RawStock(
        name=data.name.strip(),
        category=data.category,
        unit=data.unit.strip(),
        current_quantity=data.current_quantity,
        cost_per_unit=data.cost_per_unit,
        low_stock_threshold=data.low_stock_threshold,
        is_active=True,
    )
    db.add(db_raw)
    db.commit()
    db.refresh(db_raw)
    return RawStockRead.model_validate(db_raw)


def list_raw_stocks(
    db: Session,
    category: Optional[RawStockCategory] = None,
    include_inactive: bool = False,
) -> List[RawStockRead]:
    query = db.query(RawStock)
    if not include_inactive:
        query = query.filter(RawStock.is_active == True)
    if category:
        query = query.filter(RawStock.category == category)

    items = query.order_by(RawStock.category.asc(), RawStock.name.asc()).all()
    return [RawStockRead.model_validate(i) for i in items]


def update_raw_stock(db: Session, stock_id: uuid.UUID, data: RawStockUpdate) -> RawStockRead:
    db_raw = db.query(RawStock).filter(RawStock.id == stock_id).first()
    if not db_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Raw stock not found")

    update_fields = data.model_dump(exclude_unset=True)
    if "name" in update_fields and update_fields["name"] is not None:
        clean_name = update_fields["name"].strip()
        if not clean_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Raw stock name cannot be empty")
        
        # Check if name is taken by another raw stock
        existing = (
            db.query(RawStock)
            .filter(RawStock.name.ilike(clean_name), RawStock.id != stock_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Raw stock with name '{clean_name}' already exists",
            )
        update_fields["name"] = clean_name

    if "unit" in update_fields and update_fields["unit"] is not None:
        clean_unit = update_fields["unit"].strip()
        if not clean_unit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unit cannot be empty")
        update_fields["unit"] = clean_unit

    for field, value in update_fields.items():
        setattr(db_raw, field, value)

    db_raw.updated_at = now_wita()
    db.commit()
    db.refresh(db_raw)
    return RawStockRead.model_validate(db_raw)


def adjust_raw_stock_quantity(db: Session, stock_id: uuid.UUID, new_quantity: float) -> RawStockRead:
    db_raw = db.query(RawStock).filter(RawStock.id == stock_id).first()
    if not db_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Raw stock not found")

    db_raw.current_quantity = max(0.0, new_quantity)
    db_raw.updated_at = now_wita()
    db.commit()
    db.refresh(db_raw)
    return RawStockRead.model_validate(db_raw)


# ==========================================
# RAW STOCK PURCHASE & RECEIPT SERVICES
# ==========================================
def _serialize_purchase(purchase: StockPurchase) -> StockPurchaseRead:
    serialized_items: List[StockPurchaseItemRead] = []
    for item in purchase.items:
        serialized_items.append(
            StockPurchaseItemRead(
                id=item.id,
                raw_stock_id=item.raw_stock_id,
                raw_stock_name=item.raw_stock.name if item.raw_stock else None,
                unit=item.raw_stock.unit if item.raw_stock else None,
                category=item.raw_stock.category if item.raw_stock else None,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                subtotal_cost=item.subtotal_cost,
            )
        )

    return StockPurchaseRead(
        id=purchase.id,
        supplier_or_store=purchase.supplier_or_store,
        payment_method=purchase.payment_method,
        total_cost=purchase.total_cost,
        receipt_image_url=purchase.receipt_image_url,
        notes=purchase.notes,
        reimbursement_status=getattr(purchase, "reimbursement_status", None) or "not_applicable",
        reimbursed_at=getattr(purchase, "reimbursed_at", None),
        purchased_at=purchase.purchased_at,
        created_by_id=purchase.created_by_id,
        created_by_name=purchase.created_by.full_name if purchase.created_by else None,
        items=serialized_items,
    )


def record_stock_purchase(
    db: Session,
    payload: StockPurchaseCreateIn,
    receipt_image_url: Optional[str],
    current_manager: User,
) -> StockPurchaseRead:
    """
    Records a single-item or multi-item raw stock purchase with an optional receipt/payment bill image.
    Automatically increments RawStock.current_quantity and updates RawStock.cost_per_unit.
    """
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one raw stock item must be included in the purchase",
        )

    db_items: List[StockPurchaseItem] = []
    computed_total_cost = 0.0
    now = now_wita()

    for idx, item_in in enumerate(payload.items):
        # 1. Resolve or auto-create RawStock item
        raw_stock: Optional[RawStock] = None
        if item_in.raw_stock_id:
            raw_stock = db.query(RawStock).filter(RawStock.id == item_in.raw_stock_id).first()
            if not raw_stock:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"RawStock ID {item_in.raw_stock_id} not found",
                )
        elif item_in.raw_stock_name:
            clean_name = item_in.raw_stock_name.strip()
            raw_stock = db.query(RawStock).filter(RawStock.name.ilike(clean_name)).first()
            if not raw_stock:
                raw_stock = RawStock(
                    name=clean_name,
                    category=item_in.category or RawStockCategory.OTHER,
                    unit=(item_in.unit or "pcs").strip(),
                    current_quantity=0.0,
                    cost_per_unit=0.0,
                    low_stock_threshold=0.0,
                    is_active=True,
                )
                db.add(raw_stock)
                db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item #{idx + 1} must provide either raw_stock_id or raw_stock_name",
            )

        # 2. Calculate subtotal & unit cost
        if item_in.subtotal_cost is not None and item_in.subtotal_cost > 0:
            subtotal_cost = float(item_in.subtotal_cost)
            unit_cost = subtotal_cost / item_in.quantity
        elif item_in.unit_cost is not None and item_in.unit_cost > 0:
            unit_cost = float(item_in.unit_cost)
            subtotal_cost = unit_cost * item_in.quantity
        elif len(payload.items) == 1 and payload.total_cost is not None and payload.total_cost > 0:
            subtotal_cost = float(payload.total_cost)
            unit_cost = subtotal_cost / item_in.quantity
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{raw_stock.name}' requires subtotal_cost, unit_cost, or total_cost",
            )

        computed_total_cost += subtotal_cost

        # 3. Update RawStock inventory level & latest unit cost
        raw_stock.current_quantity = (raw_stock.current_quantity or 0.0) + item_in.quantity
        raw_stock.cost_per_unit = round(unit_cost, 2)
        raw_stock.is_active = True
        raw_stock.updated_at = now

        db_items.append(
            StockPurchaseItem(
                raw_stock_id=raw_stock.id,
                quantity=item_in.quantity,
                unit_cost=round(unit_cost, 2),
                subtotal_cost=round(subtotal_cost, 2),
            )
        )

    final_total_cost = float(payload.total_cost) if payload.total_cost is not None else round(computed_total_cost, 2)

    # Auto-generate descriptive notes if not provided (matches Google Sheet style e.g. "Cup, Kopi, Creamer")
    notes = payload.notes
    if not notes:
        item_names = []
        for db_item in db_items:
            stock_obj = db.query(RawStock).filter(RawStock.id == db_item.raw_stock_id).first()
            if stock_obj:
                item_names.append(stock_obj.name)
        notes = ", ".join(item_names)

    # If paid via Cafe Cash or if logged by Finance directly (unless explicitly overridden), no reimbursement is needed
    effective_reimburse_status = payload.reimbursement_status or "not_applicable"
    if payload.payment_method == ExpensePaymentMethod.CASH:
        effective_reimburse_status = "not_applicable"
    elif getattr(current_manager, "admin_task", None) == "finance":
        effective_reimburse_status = "not_applicable"

    purchase = StockPurchase(
        supplier_or_store=payload.supplier_or_store,
        payment_method=payload.payment_method,
        total_cost=final_total_cost,
        receipt_image_url=receipt_image_url,
        notes=notes,
        reimbursement_status=effective_reimburse_status,
        purchased_at=to_wita(payload.purchased_at) if payload.purchased_at else now,
        created_by_id=current_manager.id,
        items=db_items,
    )

    db.add(purchase)
    db.commit()

    if effective_reimburse_status == "pending":
        try:
            notify_finance_expense(
                purchase.supplier_or_store or "Raw Stock Restock",
                purchase.total_cost,
                str(purchase.id),
                db,
            )
        except Exception as push_err:
            print(f"[PushNotification] Stock purchase notify notice: {push_err}")

    # Reload with relationships
    reloaded = (
        db.query(StockPurchase)
        .options(
            joinedload(StockPurchase.items).joinedload(StockPurchaseItem.raw_stock),
            joinedload(StockPurchase.created_by),
        )
        .filter(StockPurchase.id == purchase.id)
        .first()
    )
    return _serialize_purchase(reloaded)


def list_stock_purchases(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 500,
) -> List[StockPurchaseRead]:
    query = db.query(StockPurchase).options(
        joinedload(StockPurchase.items).joinedload(StockPurchaseItem.raw_stock),
        joinedload(StockPurchase.created_by),
    )

    if month:
        query = query.filter(extract("month", StockPurchase.purchased_at) == month)
    if year:
        query = query.filter(extract("year", StockPurchase.purchased_at) == year)
    if start_date:
        query = query.filter(StockPurchase.purchased_at >= start_date)
    if end_date:
        query = query.filter(StockPurchase.purchased_at <= end_date)

    purchases = query.order_by(StockPurchase.purchased_at.desc()).limit(limit).all()
    return [_serialize_purchase(p) for p in purchases]


def mark_stock_purchase_reimbursed(
    db: Session,
    purchase_id: uuid.UUID,
) -> StockPurchaseRead:
    purchase = (
        db.query(StockPurchase)
        .options(
            joinedload(StockPurchase.items).joinedload(StockPurchaseItem.raw_stock),
            joinedload(StockPurchase.created_by),
        )
        .filter(StockPurchase.id == purchase_id)
        .first()
    )
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock purchase not found",
        )

    purchase.reimbursement_status = "reimbursed"
    purchase.reimbursed_at = now_wita()
    db.commit()
    db.refresh(purchase)
    return _serialize_purchase(purchase)
