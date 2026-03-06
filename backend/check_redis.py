#!/usr/bin/env python3
import asyncio
from api.core.redis import redis_client

async def check_redis_keys():
    keys = await redis_client.keys('*')
    print('Redis keys:', keys)
    
    for key in keys:
        value = await redis_client.get(key)
        print(f'Key: {key}, Type: {type(value)}, Length: {len(value) if value else 0}')

if __name__ == "__main__":
    asyncio.run(check_redis_keys())
