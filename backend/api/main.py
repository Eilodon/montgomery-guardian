from fastapi import FastAPI, HTTPException, Security, status, Depends
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from .routers import crime, requests, predictions, alerts, chat, vision, kpis
from .core.config import settings
from etl.scheduler import start_scheduler

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def validate_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return api_key

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: run ETL & start Bright Data scraper cron
    asyncio.create_task(start_scheduler())
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Montgomery Guardian API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",  # Swagger UI — show judges this
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crime.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(requests.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(predictions.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(alerts.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(chat.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(vision.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(kpis.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "montgomery-guardian-api"}
