import uuid
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from pwdlib.hashers.bcrypt import BcryptHasher
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from app.db.database import SessionLocal
from app.models.users import User

SECRET_KEY = "CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 Hours (1 cashier shift)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

password_hash_context = PasswordHash((BcryptHasher(),))

def hash_password(password: str) -> str:
    return password_hash_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with SessionLocal() as session:
        user = session.query(User).filter(User.id == uuid.UUID(user_id), User.is_active == True).first()
        if user is None:
            raise credentials_exception
        return user