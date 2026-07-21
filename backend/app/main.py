from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.models import products, stocks, operationals, orders

# Import router instances directly
from app.routers.products_router import router as product_router
from app.routers.stocks_router import router as stock_router
from app.routers.operationals_router import router as operational_router
from app.routers.orders_router import router as order_router

# Auto-create tables in pgAdmin on boot
# products.Base.metadata.create_all(bind=engine)
# stocks.Base.metadata.create_all(bind=engine)
# operationals.Base.metadata.create_all(bind=engine)
# orders.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sukasan POS API",
    description="Backend API for Sukasan Coffee POS and Management System",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers cleanly
app.include_router(product_router)
app.include_router(stock_router)
app.include_router(operational_router)
app.include_router(order_router)

@app.get("/")
def health_check():
    return {"status": "success", "message": "We runing smooth gng."}