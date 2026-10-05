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

        existing_username = db.query(User).filter(User.username == user_in.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        new_manager = User(
            username=user_in.username,
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
    def register_staff(db: Session, user_in: UserCreate, current_user: User) -> User:
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only managers can register new staff accounts",
            )

        existing_user = db.query(User).filter(User.username == user_in.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        new_user = User(
            username=user_in.username,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            profile_picture_url=user_in.profile_picture_url,
            role=user_in.role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def login(db: Session, login_data: LoginRequest) -> TokenResponse:
        user = db.query(User).filter(User.username == login_data.username, User.is_active == True).first()
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

        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.profile_picture_url is not None:
            user.profile_picture_url = user_in.profile_picture_url
        if user_in.role is not None:
            user.role = user_in.role
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.password:
            user.password_hash = hash_password(user_in.password)

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