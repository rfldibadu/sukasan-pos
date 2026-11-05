import uuid
from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.users import User
from app.core.security import get_current_user, require_manager
from app.schemas.auth_schema import (
    LoginRequest,
    UserCreate,
    UserUpdateSelf,
    UserUpdateAdmin,
    UserRead,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/setup-admin", response_model=UserRead, summary="Initial One-Time Manager Bootstrap")
def setup_initial_admin(user_in: UserCreate, db: Session = Depends(get_db)):
    return AuthService.setup_initial_admin(db, user_in)


@router.get("/users", response_model=list[UserRead], summary="List All Staff Accounts (Manager Only)")
def list_users(
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return AuthService.list_users(db, current_user)


@router.post("/register", response_model=UserRead, summary="Register Staff (Manager Only)")
def register_staff(
    user_in: UserCreate,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return AuthService.register_staff(db, user_in, current_user)


@router.post("/login", response_model=TokenResponse, summary="User Login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.login(db, login_data)


@router.post("/logout", summary="Logout User")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserRead, summary="Get Logged-in Staff Profile")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/avatar", response_model=UserRead, summary="Upload Profile Picture")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.upload_avatar(db, file, current_user)


@router.put("/me", response_model=UserRead, summary="Update Own Profile")
def update_me(
    user_in: UserUpdateSelf,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.update_me(db, user_in, current_user)


@router.put("/users/{user_id}", response_model=UserRead, summary="Update Any User (Manager Only)")
def update_user_by_id(
    user_id: uuid.UUID,
    user_in: UserUpdateAdmin,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return AuthService.update_user_by_id(db, user_id, user_in, current_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete User (Manager Only)")
def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    AuthService.delete_user(db, user_id, current_user)
    return None
