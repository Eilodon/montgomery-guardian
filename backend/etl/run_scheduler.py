#!/usr/bin/env python3
# backend/etl/run_scheduler.py
"""
Main scheduler runner for Montgomery Guardian ETL pipeline
Run this script to start the automated data pipeline
"""

import asyncio
import signal
import sys
from scheduler import start_scheduler
from chroma_setup import ChromaSetup

class ETLManager:
    def __init__(self):
        self.running = False
        
    async def start_etl_pipeline(self):
        """Start the complete ETL pipeline"""
        print("🚀 Starting Montgomery Guardian ETL Pipeline...")
        
        # Initialize ChromaDB
        print("📚 Initializing ChromaDB...")
        chroma = ChromaSetup()
        if not chroma.test_chroma_connection():
            print("⚠️ ChromaDB not initialized, populating with fallback data...")
            chroma.populate_with_fallback_data()
        
        # Start ETL scheduler
        print("⏰ Starting ETL scheduler...")
        start_scheduler()
        
        self.running = True
        print("✅ ETL Pipeline started successfully!")
        print("📊 Crime data will be refreshed every hour")
        print("📋 311 requests will be refreshed every hour")
        print("📰 News scraping will run every 15 minutes")
        
        # Keep the scheduler running
        try:
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            print("🛑 ETL Pipeline shutting down...")
            
    def stop_etl_pipeline(self):
        """Stop the ETL pipeline gracefully"""
        print("🛑 Stopping ETL Pipeline...")
        self.running = False

# Global ETL manager
etl_manager = ETLManager()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print(f"\n📡 Received signal {signum}")
    etl_manager.stop_etl_pipeline()
    sys.exit(0)

async def main():
    """Main entry point"""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await etl_manager.start_etl_pipeline()
    except KeyboardInterrupt:
        print("\n🛑 Keyboard interrupt received")
        etl_manager.stop_etl_pipeline()
    except Exception as e:
        print(f"❌ ETL Pipeline failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
