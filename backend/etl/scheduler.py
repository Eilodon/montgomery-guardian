# backend/etl/scheduler.py
import asyncio
import time
from datetime import datetime
from .crime_etl import run_crime_etl
from .requests_311_etl import run_requests_311_etl
from scraper.news_scraper import run_news_scraper
from .arcgis_client import create_fallback_data

async def run_with_timeout(coro, timeout: int = 300):
    """Bọc thép: Hủy task nếu vượt quá 5 phút (FIX 3)"""
    try:
        await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        print(f"❌ [CRITICAL] ETL Task timed out after {timeout} seconds! Task name: {coro.__name__ if hasattr(coro, '__name__') else 'unknown'}")
    except Exception as e:
        print(f"❌ ETL Error in {coro.__name__ if hasattr(coro, '__name__') else 'unknown'}: {e}")

async def run_all_etl_jobs():
    """Run all ETL jobs"""
    try:
        print("🚀 Starting all ETL jobs...")
        await run_crime_etl()
        await asyncio.sleep(2)
        await run_requests_311_etl()
        await asyncio.sleep(2)
        await run_news_scraper()
        print("✅ All ETL jobs completed successfully")
    except Exception as e:
        print(f"❌ ETL jobs failed: {e}")

def start_scheduler():
    """Start ETL scheduler"""
    try:
        create_fallback_data()
    except Exception as e:
        print(f"⚠️ Failed to create fallback data: {e}")
    
    print("⏰ ETL scheduler started.")
    print("📊 Crime + 311 every hour | News every 15 minutes")
    
    asyncio.create_task(scheduler_loop())

async def scheduler_loop():
    """Background loop using native asyncio scheduling"""
    last_hourly_run = 0
    last_15min_run = 0
    
    while True:
        now = time.time()
        
        # Crime + 311 every 1 hour (3600 seconds)
        if now - last_hourly_run >= 3600:
            # Bọc task trong Circuit Breaker (FIX 3)
            asyncio.create_task(run_with_timeout(run_all_etl_jobs(), timeout=600)) # 10p cho all jobs
            last_hourly_run = now
            
        # News every 15 minutes (900 seconds)
        elif now - last_15min_run >= 900:
            # Bọc task trong Circuit Breaker (FIX 3)
            asyncio.create_task(run_with_timeout(run_news_scraper(), timeout=300)) # 5p cho news
            last_15min_run = now
            
        await asyncio.sleep(30) # Check every 30 seconds

async def start_etl_once():
    """Run once for testing"""
    await run_all_etl_jobs()
