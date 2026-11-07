from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.models import products, stocks, operationals, orders, users
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Import router instances directly
from app.routers.auth_router import router as auth_router
from app.routers.products_router import router as product_router
from app.routers.stocks_router import router as stock_router
from app.routers.operationals_router import router as operational_router
from app.routers.orders_router import router as order_router
from app.routers.receipt_router import router as receipt_router
from app.routers.reports_router import router as reports_router

# Auto-create tables in pgAdmin on boot
# products.Base.metadata.create_all(bind=engine)
# stocks.Base.metadata.create_all(bind=engine)
# operationals.Base.metadata.create_all(bind=engine)
# orders.Base.metadata.create_all(bind=engine)
# users.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sukasan POS API",
    description="Backend API for Sukasan Coffee POS and Management System",
    version="1.0.0"
)

static_dir = Path("app/static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Enable CORS for Next.js frontend (local + remote tunnels)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.(trycloudflare\.com|ngrok-free\.app|ngrok\.app|ngrok\.io|devtunnels\.ms)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers cleanly
app.include_router(auth_router, prefix="/api")
app.include_router(product_router, prefix="/api")
app.include_router(stock_router, prefix="/api")
app.include_router(operational_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(receipt_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "success", 
        "message": "We runing smooth gng.",
        "version": "1.0.0"
        }
