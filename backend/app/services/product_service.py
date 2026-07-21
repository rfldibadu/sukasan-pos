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
        return VendorResponse.from_orm(db_vendor)

def list_vendors() -> list[VendorResponse]:
    with SessionLocal() as session:
        vendors = session.query(Vendor).filter(Vendor.is_active == True).all()
        return [VendorResponse.from_orm(v) for v in vendors]

# --- Product Services ---
def create_product(product_data: ProductIn) -> ProductRead:
    with SessionLocal() as session:
        db_product = Product(
            name=product_data.name,
            item_type=product_data.item_type,
            retail_price=product_data.retail_price,
            main_category=product_data.main_category,
            consignment_fee=product_data.consignment_fee,
            vendor_id=product_data.vendor_id
        )
        session.add(db_product)
        session.commit()
        session.refresh(db_product)
        return ProductRead.from_orm(db_product)

def list_products() -> list[ProductRead]:
    with SessionLocal() as session:
        products = session.query(Product).filter(Product.is_active == True).all()
        return [ProductRead.from_orm(p) for p in products]