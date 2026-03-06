# backend/scraper/news_scraper.py
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import List, Dict
import json
from api.core.redis import redis_client

class NewsScraper:
    def __init__(self):
        self.redis_key = "news_alerts"
        self.cache_ttl = 900  # 15 minutes
        
    async def scrape_montgomery_news(self) -> List[Dict]:
        """Scrape Montgomery news sources for safety-related content"""
        sources = [
            {
                "name": "Montgomery Police Department",
                "url": "https://www.montgomeryal.gov/Police",
                "keywords": ["crime", "safety", "arrest", "incident", "emergency"]
            },
            {
                "name": "WSFA News",
                "url": "https://www.wsfa.com",
                "keywords": ["Montgomery", "crime", "accident", "fire", "emergency"]
            },
            {
                "name": "Montgomery Advertiser",
                "url": "https://www.montgomeryadvertiser.com",
                "keywords": ["crime", "safety", "police", "fire", "accident"]
            }
        ]
        
        all_alerts = []
        
        for source in sources:
            try:
                alerts = await self.scrape_source(source)
                all_alerts.extend(alerts)
                print(f"📰 Scraped {len(alerts)} alerts from {source['name']}")
            except Exception as e:
                print(f"⚠️ Failed to scrape {source['name']}: {e}")
                
        return all_alerts
    
    async def scrape_source(self, source: Dict) -> List[Dict]:
        """Scrape a single news source"""
        # For demo purposes, create mock alerts
        # In production, this would use actual web scraping or Bright Data MCP
        
        mock_alerts = [
            {
                "id": f"alert_{datetime.now().timestamp()}_{source['name'][:3]}_1",
                "title": "Traffic Accident Reported on Interstate 85",
                "summary": "Multi-vehicle accident reported on I-85 near Montgomery. Emergency services on scene.",
                "severity": "high",
                "source": source["name"],
                "source_url": source["url"],
                "timestamp": datetime.now().isoformat(),
                "coordinates": [32.3617, -86.2792],
                "affected_neighborhood": "Downtown"
            },
            {
                "id": f"alert_{datetime.now().timestamp()}_{source['name'][:3]}_2",
                "title": "Weather Advisory: Severe Thunderstorm Warning",
                "summary": "National Weather Service has issued a severe thunderstorm warning for Montgomery area. Seek shelter immediately.",
                "severity": "medium",
                "source": source["name"],
                "source_url": source["url"],
                "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
                "coordinates": [32.3617, -86.2792],
                "affected_neighborhood": "Citywide"
            }
        ]
        
        return mock_alerts
    
    async def cache_alerts(self, alerts: List[Dict]):
        """Cache alerts in Redis"""
        try:
            alerts_json = json.dumps(alerts)
            await redis_client.setex(
                self.redis_key,
                self.cache_ttl,
                alerts_json
            )
            
            # Cache metadata
            metadata = {
                "last_updated": datetime.now().isoformat(),
                "alert_count": len(alerts),
                "source": "news_scraper"
            }
            await redis_client.setex(
                f"{self.redis_key}_metadata",
                self.cache_ttl,
                json.dumps(metadata)
            )
            
            print(f"💾 Cached {len(alerts)} news alerts")
            
        except Exception as e:
            print(f"❌ Failed to cache alerts: {e}")
    
    async def get_cached_alerts(self) -> List[Dict]:
        """Get cached alerts from Redis"""
        try:
            cached_data = await redis_client.get(self.redis_key)
            if cached_data:
                return json.loads(cached_data)
            return []
        except Exception as e:
            print(f"❌ Failed to get cached alerts: {e}")
            return []
    
    async def run_scraping_job(self):
        """Run the complete scraping job"""
        try:
            print("🔄 Starting news scraping job...")
            
            # Scrape alerts
            alerts = await self.scrape_montgomery_news()
            
            # Cache alerts
            await self.cache_alerts(alerts)
            
            print("✅ News scraping job completed successfully")
            
        except Exception as e:
            print(f"❌ News scraping job failed: {e}")
            raise

# Scraper runner function
async def run_news_scraper():
    """Run news scraper"""
    scraper = NewsScraper()
    await scraper.run_scraping_job()

if __name__ == "__main__":
    asyncio.run(run_news_scraper())
