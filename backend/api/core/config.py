# backend/api/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost/montgomery_guardian"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # External APIs
    bright_data_api_token: Optional[str] = None
    arcgis_api_timeout: int = 30
    
    # Security
    api_key: str = "mg_secret_key_2026_change_me"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # ETL Settings
    etl_interval_minutes: int = 60
    max_records_per_fetch: int = 2000
    
    # API Settings
    api_title: str = "Montgomery Guardian API"
    api_version: str = "1.0.0"
    
    # AI Agents Service
    ai_agents_url: str = "http://localhost:3001"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
