# backend/api/core/redis.py
import redis.asyncio as redis
from .config import settings
import json

# Async Redis client
redis_client = redis.from_url(settings.redis_url, decode_responses=True)

async def get_redis():
    return redis_client

async def test_redis_connection():
    """Test Redis connection"""
    try:
        await redis_client.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

async def cache_data(key: str, data: dict, ttl: int = 3600):
    """Cache data in Redis"""
    try:
        await redis_client.setex(key, ttl, json.dumps(data))
        return True
    except Exception as e:
        print(f"❌ Failed to cache data: {e}")
        return False

async def get_cached_data(key: str) -> dict:
    """Get cached data from Redis"""
    try:
        data = await redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"❌ Failed to get cached data: {e}")
        return None
