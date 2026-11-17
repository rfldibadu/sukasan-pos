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

    # AI (Google Gemini Free Tier)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"

    # WhatsApp (OpenWA Easy API + Simulator)
    whatsapp_provider: str = "openwa"  # "openwa" | "simulator"
    openwa_base_url: str = "http://localhost:8080"
    openwa_api_key: Optional[str] = None
    openwa_webhook_secret: Optional[str] = None

    # Delivery (GrabExpress / GoSend via Sandbox or Biteship)
    delivery_provider_mode: str = "sandbox"  # "sandbox" | "biteship"
    biteship_api_key: Optional[str] = None
    store_origin_address: str = "Sukasan Coffee"
    store_origin_lat: float = -8.6500
    store_origin_lng: float = 115.2167

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


def get_settings() -> Settings:
    return Settings()
