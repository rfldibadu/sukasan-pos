from pydantic import BaseModel

class ProductBase(BaseModel):
    name: str
    price: float
    is_available: bool = True

class ProductCreate(ProductBase):
    pass  # Data structure required to create a product

class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True  # Tells Pydantic to read SQLAlchemy models