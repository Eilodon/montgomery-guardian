# backend/etl/scheduler.py
import asyncio
import schedule
import time
from datetime import datetime
from .crime_etl import run_crime_etl
from .requests_311_etl import run_requests_311_etl
from scraper.news_scraper import run_news_scraper
from .arcgis_client import create_fallback_data

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
    
    # Fix critical: dùng lambda + create_task thay vì asyncio.run()
    schedule.every(1).hours.do(lambda: asyncio.create_task(run_all_etl_jobs()))
    schedule.every(15).minutes.do(lambda: asyncio.create_task(run_news_scraper()))
    
    print("⏰ ETL scheduler started.")
    print("📊 Crime + 311 every hour | News every 15 minutes")
    
    asyncio.create_task(scheduler_loop())

async def scheduler_loop():
    """Background loop"""
    while True:
        schedule.run_pending()
        await asyncio.sleep(60)

async def start_etl_once():
    """Run once for testing"""
    await run_all_etl_jobs()
