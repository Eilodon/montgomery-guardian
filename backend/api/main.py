# backend/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from .routers import crime, requests, predictions, alerts, chat, vision
from .core.config import settings
from etl.scheduler import start_scheduler

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
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crime.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(vision.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "montgomery-guardian-api"}
