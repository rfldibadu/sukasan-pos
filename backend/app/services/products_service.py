import uuid
from fastapi import HTTPException
from app.db.database import SessionLocal
from app.models.products import Product, Vendor
from app.schemas.products_schema import ProductIn, ProductRead, VendorIn, VendorResponse

# --- Vendor Services ---
def create_vendor(vendor_data: VendorIn) -> VendorResponse:
    with SessionLocal() as session:
        db_vendor = Vendor(
            name=vendor_data.name,
            contact_info=vendor_data.contact_info
        )
        session.add(db_vendor)
        session.commit()
        session.refresh(db_vendor)
        return VendorResponse.model_validate(db_vendor)

def list_vendors() -> list[VendorResponse]:
    with SessionLocal() as session:
        vendors = session.query(Vendor).filter(Vendor.is_active == True).all()
        return [VendorResponse.model_validate(v) for v in vendors]

# --- Product Services ---
def create_product(product_data: ProductIn) -> ProductRead:
    with SessionLocal() as session:
        db_product = Product(
            name=product_data.name,
            item_type=product_data.item_type,
            retail_price=product_data.retail_price,
            main_category=product_data.main_category,
            consignment_fee=product_data.consignment_fee,
            stock_quantity=product_data.stock_quantity,
            vendor_id=product_data.vendor_id
        )
        session.add(db_product)
        session.commit()
        session.refresh(db_product)
        return ProductRead.model_validate(db_product)

def list_products() -> list[ProductRead]:
    with SessionLocal() as session:
        products = session.query(Product).filter(Product.is_active == True).all()
        return [ProductRead.model_validate(p) for p in products]

def update_product_stock(product_id: uuid.UUID, new_stock: int) -> ProductRead:
    """Explicitly update stock level for consignment items."""
    with SessionLocal() as session:
        product = session.query(Product).filter(
            Product.id == product_id, 
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found or inactive")
            
        product.stock_quantity = max(0, new_stock)
        session.commit()
        session.refresh(product)
        return ProductRead.model_validate(product)
    
def adjust_product_stock(product_id: uuid.UUID, delta: int) -> ProductRead:
    """Increment or decrement product stock quantity (e.g., delta=-1 on sale)."""
    with SessionLocal() as session:
        product = session.query(Product).filter(
            Product.id == product_id, 
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found or inactive")
            
        current = product.stock_quantity or 0
        new_quantity = current + delta
        if new_quantity < 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {product.name}. Available: {current}"
            )
            
        product.stock_quantity = new_quantity
        session.commit()
        session.refresh(product)
        return ProductRead.model_validate(product)