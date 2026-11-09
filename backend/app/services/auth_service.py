import uuid
import shutil
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.models.users import User, UserRole
from app.schemas.auth_schema import (
    UserCreate,
    UserUpdateSelf,
    UserUpdateAdmin,
    LoginRequest,
    TokenResponse,
)
from app.core.security import hash_password, verify_password, create_access_token

AVATAR_DIR = Path("app/static/uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


class AuthService:
    @staticmethod
    def setup_initial_admin(db: Session, user_in: UserCreate) -> User:
        existing_manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        if existing_manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A manager account already exists. Use /auth/register with manager credentials instead.",
            )

        clean_username = user_in.username.strip()
        existing_username = db.query(User).filter(User.username == clean_username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        new_manager = User(
            username=clean_username,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            profile_picture_url=user_in.profile_picture_url,
            role=UserRole.MANAGER,
        )
        db.add(new_manager)
        db.commit()
        db.refresh(new_manager)
        return new_manager

    @staticmethod
    def list_users(db: Session, current_user: User) -> list[User]:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can list staff accounts",
            )
        return db.query(User).order_by(User.created_at.asc()).all()

    @staticmethod
    def register_staff(db: Session, user_in: UserCreate, current_user: User) -> User:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can register new staff accounts",
            )

        clean_username = user_in.username.strip()
        existing_user = db.query(User).filter(User.username == clean_username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        new_user = User(
            username=clean_username,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            profile_picture_url=user_in.profile_picture_url,
            role=user_in.role,
            admin_task=(
                (user_in.admin_task or "field_manager")
                if user_in.role == UserRole.MANAGER
                else None
            ),
            salary_day=(
                max(1, min(31, user_in.salary_day or 30))
                if user_in.role == UserRole.CASHIER
                else None
            ),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def login(db: Session, login_data: LoginRequest) -> TokenResponse:
        clean_username = login_data.username.strip()
        user = db.query(User).filter(User.username == clean_username, User.is_active == True).first()
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
            role=user.role,
            admin_task=user.admin_task,
        )

    @staticmethod
    def upload_avatar(db: Session, file: UploadFile, current_user: User) -> User:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image",
            )

        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
        filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = AVATAR_DIR / filename

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        relative_url = f"/static/uploads/avatars/{filename}"

        current_user.profile_picture_url = relative_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def update_me(db: Session, user_in: UserUpdateSelf, current_user: User) -> User:
        if user_in.full_name is not None:
            current_user.full_name = user_in.full_name
        if user_in.profile_picture_url is not None:
            current_user.profile_picture_url = user_in.profile_picture_url
        if user_in.password:
            current_user.password_hash = hash_password(user_in.password)

        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def update_user_by_id(
        db: Session, user_id: uuid.UUID, user_in: UserUpdateAdmin, current_user: User
    ) -> User:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can modify other users",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if user_in.password:
            if user.role == UserRole.MANAGER and user.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admins cannot change another admin's password. Each admin can only change their own password.",
                )
            user.password_hash = hash_password(user_in.password)

        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.profile_picture_url is not None:
            user.profile_picture_url = user_in.profile_picture_url
        if user_in.role is not None:
            user.role = user_in.role
            if user.role == UserRole.MANAGER:
                user.salary_day = None
                if not user.admin_task:
                    user.admin_task = "field_manager"
            else:
                user.admin_task = None
                if not user.salary_day:
                    user.salary_day = 30
        if user_in.admin_task is not None:
            user.admin_task = user_in.admin_task if user.role == UserRole.MANAGER else None
        if user_in.salary_day is not None:
            user.salary_day = (
                max(1, min(31, user_in.salary_day))
                if user.role == UserRole.CASHIER
                else None
            )
        if user_in.is_active is not None:
            user.is_active = user_in.is_active

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: uuid.UUID, current_user: User) -> None:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can delete users",
            )

        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Managers cannot delete their own account",
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        db.delete(user)
        db.commit()
