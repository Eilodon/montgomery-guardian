from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost/montgomery_guardian"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_password: Optional[str] = None
    
    @property
    def redis_url_with_auth(self) -> str:
        """[THỢ RÈN] Tiêm Auth động vào URL, bảo toàn cấu trúc mạng Docker"""
        if self.redis_password and "@" not in self.redis_url:
            # Thay thế 'redis://' thành 'redis://:password@'
            return self.redis_url.replace("redis://", f"redis://:{self.redis_password}@")
        return self.redis_url
    
    # External APIs
    bright_data_api_token: Optional[str] = None
    arcgis_api_timeout: int = 30
    
    # Security - BẮT BUỘC phải có trong .env
    api_key: str = Field(..., validation_alias="API_KEY") # Không còn default nữa!
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    @field_validator('api_key')
    @classmethod
    def validate_api_key_entropy(cls, v: str) -> str:
        """[THỢ RÈN] Ép entropy cao cho Production, nới lỏng cho Dev"""
        if v.startswith("dev_"):
            return v # Bypass cho local development
        if len(v) < 32:
            raise ValueError("Production API_KEY must be >= 32 chars. Use 'dev_' prefix for local testing.")
        return v
    
    # ETL Settings
    etl_interval_minutes: int = 60
    max_records_per_fetch: int = 2000
    
    # API Settings
    api_title: str = "Montgomery Guardian API"
    api_version: str = "1.0.0"
    
    # AI Agents Service
    ai_agents_url: str = "http://localhost:3001"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore", # tránh lỗi khi thêm biến mới
    }

settings = Settings()
