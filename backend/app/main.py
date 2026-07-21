from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine
from app.models import products
from app.routers.products_router import router as product_router
# from routers.stock_router import router as stock_router

# Auto-create tables in pgAdmin on start
products.Base.metadata.create_all(bind=engine)
# stock.Base.metadata.create_all(bind=engine)
# operational.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sukasan POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers cleanly
app.include_router(product_router, prefix="/api", tags=["Products"])
# app.include_router(stock_router, prefix="/api", tags=["Stock & Inventory"])

@app.get("/")
def health_check():
    return {"status": "Sukasan POS Backend is running seamlessly"}