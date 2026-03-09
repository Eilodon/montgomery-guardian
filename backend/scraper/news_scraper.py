# backend/scraper/news_scraper.py
import asyncio
import orjson
from datetime import datetime
from typing import List, Dict

from .bright_data_client import scrape_all_sources
from .alert_extractor import extract_alerts_from_content
from api.core.redis import redis_client

class NewsScraper:
    def __init__(self):
        self.redis_key = "news_alerts"
        self.cache_ttl = 900  # 15 minutes
        
    async def run_scraping_job(self):
        print("🔄 [News Scraper] Initiating Global Sweep...")
        
        # 1. Gọi Lò phản ứng cào dữ liệu (đã xử lý concurrent bên trong)
        scraped_pages = await scrape_all_sources()
        
        all_alerts = []
        # 2. Extract dữ liệu
        for page in scraped_pages:
            try:
                alerts = extract_alerts_from_content(page["url"], page["content"])
                all_alerts.extend([alert.model_dump() for alert in alerts])
            except Exception as e:
                print(f"⚠️ Extraction failed for {page['url']}: {e}")
        
        # 3. Cache Data
        await self.cache_alerts(all_alerts)
        print(f"✅ [News Scraper] Sweep Complete. Extracted {len(all_alerts)} alerts.")

    async def cache_alerts(self, alerts: List[Dict]):
        try:
            payload = orjson.dumps(alerts).decode('utf-8')
            await redis_client.setex(self.redis_key, self.cache_ttl, payload)
            
            metadata = {
                "last_updated": datetime.now().isoformat(),
                "alert_count": len(alerts),
                "source": "news_scraper"
            }
            await redis_client.setex(
                f"{self.redis_key}_metadata",
                self.cache_ttl,
                orjson.dumps(metadata).decode('utf-8')
            )
        except Exception as e:
            print(f"❌ Redis Cache Error: {e}")
    
    async def get_cached_alerts(self) -> List[Dict]:
        """Get cached alerts from Redis"""
        try:
            cached_data = await redis_client.get(self.redis_key)
            if cached_data:
                return orjson.loads(cached_data)
            return []
        except Exception as e:
            print(f"❌ Failed to get cached alerts: {e}")
            return []

# Legacy compatibility functions
async def scrape_montgomery_news() -> List[Dict]:
    """Legacy function for backward compatibility"""
    scraper = NewsScraper()
    pages = await scrape_all_sources()
    
    all_alerts = []
    for page in pages:
        try:
            alerts = extract_alerts_from_content(page["url"], page["content"])
            all_alerts.extend([alert.model_dump() for alert in alerts])
        except Exception as e:
            print(f"⚠️ Extraction failed for {page['url']}: {e}")
    
    return all_alerts

# Scraper runner function
async def run_news_scraper():
    """Run news scraper"""
    scraper = NewsScraper()
    await scraper.run_scraping_job()

if __name__ == "__main__":
    asyncio.run(run_news_scraper())
