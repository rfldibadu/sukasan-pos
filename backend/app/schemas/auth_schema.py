import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.users import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    profile_picture_url: Optional[str] = None
    role: UserRole = UserRole.CASHIER
    admin_task: Optional[str] = None
    salary_day: Optional[int] = None


class UserUpdateSelf(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    profile_picture_url: Optional[str] = None


class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: Optional[UserRole] = None
    admin_task: Optional[str] = None
    salary_day: Optional[int] = None
    is_active: Optional[bool] = None


class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    profile_picture_url: Optional[str] = None
    role: UserRole
    admin_task: Optional[str] = None
    salary_day: Optional[int] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    role: UserRole
    admin_task: Optional[str] = None
