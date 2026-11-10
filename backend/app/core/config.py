# core/config.py

import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    app_name: str = "FastAPI App"
    debug: bool = True
    port: int = 8000
    database_url: str = ""  # required but loaded from .env
    vapid_public_key: Optional[str] = None
    vapid_private_key_pem: Optional[str] = None
    vapid_claim_email: Optional[str] = "mailto:admin@sukasan.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


def get_settings() -> Settings:
    return Settings()
