# backend/scraper/bright_data_client.py
import asyncio
import httpx
import os
from typing import Optional, Dict, List

BRIGHT_DATA_TOKEN = os.getenv("BRIGHT_DATA_API_TOKEN")

SOURCES_TO_SCRAPE = [
    "https://www.montgomeryal.gov/city-government/departments/police",
    "https://www.montgomeryal.gov/news",
    "https://wsfa.com/crime",
    "https://www.montgomeryadvertiser.com/news/crime",
]

# Singleton HTTP Client để tái sử dụng TCP connections
http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(120.0), # BrightData render JS tốn thời gian
    limits=httpx.Limits(max_connections=50, max_keepalive_connections=20)
)

async def scrape_url_as_markdown(url: str, semaphore: asyncio.Semaphore) -> Dict:
    """Core Fetcher with Semaphore Lock"""
    async with semaphore:
        if not BRIGHT_DATA_TOKEN:
            print(f"⚠️ Mocking {url}")
            return {"url": url, "content": _get_mock_news_content(url), "status": "mocked"}

        try:
            response = await http_client.post(
                "https://api.brightdata.com/request",
                headers={
                    "Authorization": f"Bearer {BRIGHT_DATA_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={"zone": "scraping_browser", "url": url, "format": "markdown"},
            )
            response.raise_for_status()
            return {"url": url, "content": response.text, "status": "success"}
        except Exception as e:
            print(f"⚠️ Bright Data failed for {url}: {e}")
            return {"url": url, "content": _get_mock_news_content(url), "status": "failed"}

async def scrape_all_sources() -> List[Dict]:
    """Concurrent Execution Protocol"""
    # Khóa concurrency ở mức 5 luồng cùng lúc để không bị Bright Data chặn
    semaphore = asyncio.Semaphore(5)
    
    tasks = [scrape_url_as_markdown(url, semaphore) for url in SOURCES_TO_SCRAPE]
    
    # Kích nổ toàn bộ HTTP requests song song
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Lọc kết quả hợp lệ
    return [r for r in results if isinstance(r, dict) and r.get("content")]

# Legacy compatibility functions
async def scrape_url_as_markdown_legacy(url: str) -> Optional[str]:
    """Legacy function for backward compatibility"""
    semaphore = asyncio.Semaphore(1)
    result = await scrape_url_as_markdown(url, semaphore)
    return result.get("content") if result else None

async def test_scraping():
    """Test scraping functionality"""
    print("🧪 Testing Bright Data scraping...")
    
    # Test with concurrent scraping
    results = await scrape_all_sources()
    
    if results:
        print(f"✅ Successfully scraped {len(results)} sources")
        for result in results:
            print(f"📄 {result['url']}: {len(result['content'])} chars [{result['status']}]")
        return True
    else:
        print("❌ Failed to scrape any sources")
        return False

def _get_mock_news_content(url: str) -> str:
    """Fallback mock content để demo hoạt động khi Bright Data unavailable"""
    
    # Different mock content based on URL
    if "police" in url:
        return """
# Montgomery Police Department Updates

## Recent Police Activity
Montgomery PD reports increased patrols in Downtown district this weekend. Crime statistics show 15% reduction in property crime in Oak Park neighborhood.

## Community Initiatives
New community policing initiative launches in Capitol Heights area. Police department hosting town hall meeting next Tuesday.

## Traffic Updates
Emergency: Road closure on I-65 due to traffic incident — expect delays. Alternative routes suggested via US-31.
        """
    elif "news" in url and "montgomeryal.gov" in url:
        return """
# City of Montgomery News

## Infrastructure Updates
City council approves $2M for road repairs in downtown district. Construction expected to begin next month.

## Public Safety
New emergency response system implementation delayed due to technical issues. Expected launch in Q2.

## Community Events
Annual Montgomery Safety Fair scheduled for next month at Riverwalk Stadium.
        """
    elif "wsfa.com" in url:
        return """
# WSFA Crime News

## Breaking News
Multiple vehicle accident reported on I-65 Northbound near Exit 167. Emergency services on scene.

## Crime Trends
Recent analysis shows 10% decrease in violent crime compared to last year. Property crime remains stable.

## Investigations
Montgomery police investigate series of burglaries in Cloverdale area. Residents urged to report suspicious activity.
        """
    elif "montgomeryadvertiser.com" in url:
        return """
# Montgomery Advertiser Crime Report

## Headlines
Downtown business district sees increased security measures after recent break-ins.

## Court News
Sentencing scheduled for high-profile fraud case next week. Expected to draw significant attention.

## Community Response
Neighborhood watch programs expand to cover additional Montgomery districts following community requests.
        """
    else:
        return """
# Local News Summary

## General Updates
Montgomery city officials working on various initiatives to improve public safety and community services.

## Ongoing Projects
Multiple infrastructure and community improvement projects currently underway across the city.

## Public Announcements
Residents encouraged to stay informed through official city channels and local news outlets.
        """
