import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.users import User, UserRole
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str
    
class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: UserRole = UserRole.CASHIER

class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    role: UserRole


# --- Endpoints ---

@router.post("/setup-admin", response_model=UserRead, summary="Initial One-Time Manager Bootstrap")
def setup_initial_admin(user_in: UserCreate):
    """
    Allows creating the very first Manager account.
    Once a manager exists in the DB, this endpoint locks automatically.
    """
    with SessionLocal() as session:
        existing_manager = session.query(User).filter(User.role == UserRole.MANAGER).first()
        if existing_manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A manager account already exists. Use /auth/register with manager credentials instead."
            )

        existing_username = session.query(User).filter(User.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        new_manager = User(
            username=user_in.username,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            role=UserRole.MANAGER
        )
        session.add(new_manager)
        session.commit()
        session.refresh(new_manager)
        return new_manager


@router.post("/register", response_model=UserRead, summary="Register Staff (Manager Only)")
def register_staff(
    user_in: UserCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Only logged-in Managers can create new staff or cashier accounts.
    """
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can register new staff accounts"
        )

    with SessionLocal() as session:
        existing_user = session.query(User).filter(User.username == user_in.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )

        new_user = User(
            username=user_in.username,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            role=user_in.role
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest):
    with SessionLocal() as session:
        user = session.query(User).filter(User.username == login_data.username, User.is_active == True).first()
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            full_name=user.full_name,
            role=user.role
        )


@router.get("/me", response_model=UserRead, summary="Get Logged-in Staff Profile")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user