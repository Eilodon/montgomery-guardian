from fastapi import FastAPI, HTTPException, Security, status, Depends
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from .routers import crime, requests, predictions, alerts, chat, vision, kpis, districts
from .core.config import settings
from .websocket_manager import websocket_endpoint, start_heartbeat
from etl.scheduler import start_scheduler

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def validate_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động ETL Worker
    # [THỢ RÈN] start_scheduler() là sync def, tự create_task bên trong - không wrap thêm create_task
    start_scheduler()
    
    # Khởi động WebSocket Heartbeat Monitor
    start_heartbeat()
    
    print("🚀 Montgomery Guardian Core Engine Online")
    yield
    print("🛑 Shutting down gracefully...")

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)

app.include_router(crime.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(requests.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(predictions.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(alerts.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(chat.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(vision.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(kpis.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])
app.include_router(districts.router, prefix="/api/v1", dependencies=[Depends(validate_api_key)])

# Add WebSocket endpoint
app.add_api_websocket_route("/ws", websocket_endpoint)

@app.get("/health")
async def health_check():
    # Rate limit: 100/minute would go here
    return {"status": "ok", "service": "montgomery-guardian-api"}
