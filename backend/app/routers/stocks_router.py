from fastapi import APIRouter, Query, HTTPException
from app.schemas.stocks_schema import RawStockIn, ConsignmentStockIn, ConsignmentStockUpdate
from app.services.stocks_service import (
    create_raw_stock, list_raw_stocks, 
    init_consignment_stock, update_consignment_stock, list_consignment_stocks
)

router = APIRouter()

def success_response(data: dict | list, message: str):
    return {"status": "success", "message": message, "data": data}

# --- Raw Inventory API ---
@router.post("/stocks/raw")
def add_raw_stock(payload: RawStockIn):
    try:
        result = create_raw_stock(payload)
        return success_response({"id": result.id, "name": result.name}, "Successfully logged raw ingredient")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stocks/raw")
def get_raw_stocks():
    try:
        results = list_raw_stocks()
        return success_response([r.model_dump(mode="json") for r in results], "Fetched raw stock levels")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Consignment Inventory API ---
@router.post("/stocks/consignment")
def add_consignment_stock(payload: ConsignmentStockIn):
    try:
        result = init_consignment_stock(payload)
        return success_response({"id": result.id}, "Successfully initialized consignment stock")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/stocks/consignment/{product_id}")
def manually_update_consignment_quantity(product_id: int, payload: ConsignmentStockUpdate):
    try:
        result = update_consignment_stock(product_id, payload.current_quantity)
        return success_response({"product_id": result.product_id, "current_quantity": result.current_quantity}, "Stock updated successfully")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stocks/consignment")
def get_consignment_stocks():
    try:
        results = list_consignment_stocks()
        return success_response([c.model_dump(mode="json") for c in results], "Fetched active consignment levels")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))