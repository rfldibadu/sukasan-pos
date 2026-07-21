from app.db.database import SessionLocal
from app.models.stocks import RawStock, ConsignmentStock
from app.schemas.stocks_schema import RawStockIn, RawStockRead, ConsignmentStockIn, ConsignmentStockRead

# --- Raw Stock Logic ---
def create_raw_stock(data: RawStockIn) -> RawStockRead:
    with SessionLocal() as session:
        db_raw = RawStock(
            name=data.name,
            current_quantity=data.current_quantity,
            unit=data.unit,
            cost_per_unit=data.cost_per_unit
        )
        session.add(db_raw)
        session.commit()
        session.refresh(db_raw)
        # Use model_validate instead of from_attributes
        return RawStockRead.model_validate(db_raw)

def list_raw_stocks() -> list[RawStockRead]:
    with SessionLocal() as session:
        items = session.query(RawStock).all()
        return [RawStockRead.model_validate(i) for i in items]

# --- Consignment Stock Logic ---
def init_consignment_stock(data: ConsignmentStockIn) -> ConsignmentStockRead:
    with SessionLocal() as session:
        db_stock = ConsignmentStock(
            product_id=data.product_id,
            current_quantity=data.current_quantity
        )
        session.add(db_stock)
        session.commit()
        session.refresh(db_stock)
        return ConsignmentStockRead.model_validate(db_stock)

def update_consignment_stock(product_id: int, new_qty: int) -> ConsignmentStockRead:
    with SessionLocal() as session:
        db_stock = session.query(ConsignmentStock).filter(ConsignmentStock.product_id == product_id).first()
        if not db_stock:
            # Fallback auto-initialization if record doesn't exist yet
            db_stock = ConsignmentStock(product_id=product_id, current_quantity=new_qty)
            session.add(db_stock)
        else:
            db_stock.current_quantity = new_qty
            
        session.commit()
        session.refresh(db_stock)
        return ConsignmentStockRead.model_validate(db_stock)

def list_consignment_stocks() -> list[ConsignmentStockRead]:
    with SessionLocal() as session:
        items = session.query(ConsignmentStock).all()
        return [ConsignmentStockRead.model_validate(i) for i in items]