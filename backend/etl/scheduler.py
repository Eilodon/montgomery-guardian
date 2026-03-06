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
        
        # Run crime data ETL
        await run_crime_etl()
        
        # Wait a bit between jobs
        await asyncio.sleep(2)
        
        # Run 311 requests ETL
        await run_requests_311_etl()
        
        # Wait a bit between jobs
        await asyncio.sleep(2)
        
        # Run news scraper
        await run_news_scraper()
        
        print("✅ All ETL jobs completed successfully")
        
    except Exception as e:
        print(f"❌ ETL jobs failed: {e}")

def start_scheduler():
    """Start ETL scheduler"""
    # Create fallback data on startup
    try:
        create_fallback_data()
    except Exception as e:
        print(f"⚠️ Failed to create fallback data: {e}")
    
    # Schedule ETL jobs
    schedule.every(1).hours.do(run_scheduled_etl)  # Every hour for crime + 311
    schedule.every(15).minutes.do(run_scheduled_news_scraping)  # Every 15 minutes for news
    
    print("⏰ ETL scheduler started.")
    print("📊 Crime + 311 data will refresh every hour")
    print("📰 News scraping will run every 15 minutes")
    
    # Run scheduler in background
    asyncio.create_task(scheduler_loop())

def run_scheduled_etl():
    """Run ETL jobs on schedule"""
    try:
        # Run async ETL jobs (crime + 311)
        asyncio.run(run_crime_etl())
        asyncio.run(run_requests_311_etl())
    except Exception as e:
        print(f"❌ Scheduled ETL failed: {e}")

def run_scheduled_news_scraping():
    """Run news scraper on schedule"""
    try:
        # Run async news scraper
        asyncio.run(run_news_scraper())
    except Exception as e:
        print(f"❌ Scheduled news scraping failed: {e}")

async def scheduler_loop():
    """Background loop for scheduler"""
    while True:
        schedule.run_pending()
        await asyncio.sleep(60)  # Check every minute

async def start_etl_once():
    """Run ETL jobs once (for testing or manual trigger)"""
    await run_all_etl_jobs()
