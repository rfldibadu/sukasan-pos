from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import app.models.models as models
import schemas
from app.db.database import engine, get_db

# Create the database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sukasan POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Sukasan POS API is online"}

# Quick test endpoint to verify SQLAlchemy + Pydantic are linked
@app.get("/products", response_model=list[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return products