# core/config.py

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()
class Settings(BaseSettings):
    app_name: str = "FastAPI App"
    debug: bool = True
    port: int = 8000
    database_url: str = ""# ✅ required but loaded from .env

    class Config:
        env_file = ".env"  # you can put DATABASE_URL etc in here


def get_settings() -> Settings:
    return Settings()
