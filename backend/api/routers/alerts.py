# backend/api/routers/alerts.py
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import orjson
from ..models.schemas import AlertsResponse, AlertItem
from ..core.redis import redis_client

router = APIRouter()

@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip")
):
    """
    Get safety alerts from high-speed Redis Cache (Zero-latency).
    """
    try:
        # Lấy trực tiếp từ Redis do background ETL đã cập nhật
        cached_data = await redis_client.get("news_alerts")
        
        if not cached_data:
            return AlertsResponse(data=[], total=0)

        alerts_data = orjson.loads(cached_data)
        
        # Lọc theo severity
        if severity:
            alerts_data = [a for a in alerts_data if a.get('severity', '').lower() == severity.lower()]
            
        # Sắp xếp mới nhất
        alerts_data.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Phân trang
        paginated_alerts = alerts_data[offset:offset + limit]
        
        return AlertsResponse(data=paginated_alerts, total=len(alerts_data))
        
    except Exception as e:
        print(f"❌ [API/Alerts] Error reading from cache: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching alerts")
