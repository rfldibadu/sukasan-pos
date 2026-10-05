from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.schemas.products_schema import ProductIn, VendorIn
from app.services.products_service import create_product, list_products, create_vendor, list_vendors

router = APIRouter()

def success_response(data: dict | list, message: str):
    return {"status": "success", "message": message, "data": data}

def paginated_response(data: list, page: int, limit: int, total: int, message: str):
    return {
        "status": "success",
        "message": message,
        "meta": {"page": page, "limit": limit, "total_data": total},
        "data": data
    }

# --- Vendor Routes ---
@router.post("/vendors")
def add_vendor(vendor: VendorIn):
    try:
        result = create_vendor(vendor)
        return success_response({"id": result.id, "name": result.name}, "Successfully registered vendor")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vendors")
def get_vendors():
    try:
        results = list_vendors()
        return success_response([v.model_dump(mode="json") for v in results], "Successfully fetched vendors")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Product Routes ---
@router.post("/products")
def add_product(product: ProductIn):
    try:
        result = create_product(product)
        return success_response({"id": result.id, "name": result.name}, "Successfully created product")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/products")
def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    item_type: Optional[str] = Query(None),
    main_category: Optional[str] = Query(None)
):
    try:
        results = list_products()

        # Apply filters
        if item_type:
            results = [p for p in results if getattr(p, "item_type", None) == item_type.upper()]
        if main_category:
            results = [p for p in results if getattr(p, "main_category", None) == main_category.upper()]

        total_data = len(results)
        start = (page - 1) * limit
        end = start + limit
        paginated_data = [product.model_dump(mode="json") for product in results[start:end]]
        
        return paginated_response(paginated_data, page, limit, total_data, "Successfully fetched products")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))