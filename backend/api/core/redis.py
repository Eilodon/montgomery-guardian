# backend/api/core/redis.py
import redis.asyncio as redis
from .config import settings
import json

# Internal Redis client
_redis_client = None

def get_redis_client():
    """Get or initialize the Redis client with retries and timeouts"""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url, 
            decode_responses=True,
            retry_on_timeout=True,
            socket_connect_timeout=5,
            health_check_interval=30
        )
    return _redis_client

# Backward compatibility (only use inside async functions or after initialization)
redis_client = None 

async def get_redis():
    return get_redis_client()

async def test_redis_connection():
    """Test Redis connection"""
    client = get_redis_client()
    try:
        await client.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

async def cache_data(key: str, data: dict, ttl: int = 3600):
    """Cache data in Redis"""
    client = get_redis_client()
    try:
        await client.setex(key, ttl, json.dumps(data))
        return True
    except Exception as e:
        print(f"❌ Failed to cache data: {e}")
        return False

async def get_cached_data(key: str) -> dict:
    """Get cached data from Redis"""
    client = get_redis_client()
    try:
        data = await client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"❌ Failed to get cached data: {e}")
        return None
