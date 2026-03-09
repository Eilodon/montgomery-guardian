# backend/api/core/redis.py
import redis.asyncio as redis
import orjson
from typing import Optional, Any
from .config import settings

# Bất biến: Khởi tạo Connection Pool một lần duy nhất cho toàn bộ Application Lifecycle
redis_pool = redis.ConnectionPool.from_url(
    settings.redis_url, 
    decode_responses=True,
    max_connections=100, # Đủ sức chịu tải 10k request/sec
    socket_connect_timeout=5,
    health_check_interval=30
)

# Global Client
redis_client = redis.Redis(connection_pool=redis_pool)

async def test_redis_connection() -> bool:
    try:
        await redis_client.ping()
        print("✅ Redis: Connection Pool Established [100% Limitless Scale]")
        return True
    except Exception as e:
        print(f"❌ Redis [FATAL ERROR]: {e}")
        return False

async def cache_data(key: str, data: dict | list, ttl: int = 3600) -> bool:
    try:
        # orjson.dumps trả về bytes, decode sang string để lưu vào Redis decode_responses=True
        payload = orjson.dumps(data).decode('utf-8')
        await redis_client.setex(key, ttl, payload)
        return True
    except Exception as e:
        print(f"❌ Redis Cache Failed: {e}")
        return False

async def get_cached_data(key: str) -> Optional[Any]:
    try:
        data = await redis_client.get(key)
        # orjson.loads nhận string hoặc bytes cực nhanh
        return orjson.loads(data) if data else None
    except Exception as e:
        print(f"❌ Redis Retrieve Failed: {e}")
        return None
