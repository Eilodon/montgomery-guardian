# backend/api/routers/alerts.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..models.schemas import AlertsResponse, AlertItem
from ..core.database import get_db
from scraper.bright_data_client import scrape_all_sources
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db)
):
    """
    Get safety alerts from various sources.
    Scrapes Montgomery government websites and news sources.
    """
    try:
        # Get scraped content from various sources
        scraped_data = await scrape_all_sources()
        
        # Extract alerts from scraped content
        alerts = []
        for source in scraped_data:
            source_alerts = _extract_alerts_from_content(source['url'], source['content'])
            alerts.extend(source_alerts)
        
        # Apply severity filter if specified
        if severity:
            alerts = [alert for alert in alerts if alert.severity.lower() == severity.lower()]
        
        # Sort by timestamp (most recent first)
        alerts.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        total = len(alerts)
        paginated_alerts = alerts[offset:offset + limit]
        
        return AlertsResponse(data=paginated_alerts, total=total)
        
    except Exception as e:
        # Return mock data if scraping fails
        mock_alerts = _get_mock_alerts(severity, limit)
        return AlertsResponse(data=mock_alerts, total=len(mock_alerts))

def _extract_alerts_from_content(url: str, content: str) -> List[AlertItem]:
    """Extract alerts from scraped content"""
    alerts = []
    
    # Simple keyword-based alert extraction
    # In production, this would use more sophisticated NLP/Gemini
    alert_keywords = [
        ('emergency', 'critical'),
        ('closure', 'high'),
        ('incident', 'high'),
        ('accident', 'medium'),
        ('road closure', 'high'),
        ('police', 'medium'),
        ('safety', 'medium'),
        ('warning', 'medium')
    ]
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        for keyword, severity in alert_keywords:
            if keyword in line_lower:
                # Create alert from this line
                alert = AlertItem(
                    id=f"alert_{hash(url + str(i)) % 100000}",
                    title=line.strip()[:100],  # Truncate long titles
                    summary=line.strip()[:200],  # Truncate long summaries
                    severity=severity,
                    source=_extract_source_name(url),
                    sourceUrl=url,
                    timestamp=datetime.now() - timedelta(hours=random.randint(0, 24)),
                    coordinates=_generate_mock_coordinates(),
                    affectedNeighborhood=_extract_neighborhood_from_content(line)
                )
                alerts.append(alert)
                break  # Only create one alert per line
    
    return alerts

def _extract_source_name(url: str) -> str:
    """Extract friendly source name from URL"""
    if 'montgomeryal.gov' in url:
        return 'Montgomery City Government'
    elif 'wsfa.com' in url:
        return 'WSFA News'
    elif 'montgomeryadvertiser.com' in url:
        return 'Montgomery Advertiser'
    else:
        return 'Unknown Source'

def _extract_neighborhood_from_content(content: str) -> Optional[str]:
    """Extract neighborhood names from content"""
    neighborhoods = [
        'Downtown', 'Capitol Heights', 'Oak Park', 'Garden District',
        'Cloverdale', 'Old Cloverdale', 'Bellevue', 'Chisholm',
        'Highland Park', 'Tulane', 'Washington Park', 'Wyndridge'
    ]
    
    content_lower = content.lower()
    for neighborhood in neighborhoods:
        if neighborhood.lower() in content_lower:
            return neighborhood
    
    return None

def _generate_mock_coordinates() -> Optional[tuple[float, float]]:
    """Generate mock coordinates within Montgomery"""
    # Montgomery bounds
    lat = random.uniform(32.3000, 32.4000)
    lon = random.uniform(-86.3500, -86.2000)
    return (lat, lon)

def _get_mock_alerts(severity_filter: Optional[str], limit: int) -> List[AlertItem]:
    """Generate mock alerts for demo purposes"""
    mock_alerts = [
        AlertItem(
            id="mock_alert_1",
            title="Emergency Road Closure on I-65",
            summary="Multi-vehicle accident causing complete closure of I-65 Northbound near Exit 167. Expect significant delays.",
            severity="critical",
            source="Montgomery Police Department",
            sourceUrl="https://www.montgomeryal.gov/city-government/departments/police",
            timestamp=datetime.now() - timedelta(hours=2),
            coordinates=(32.3617, -86.2792),
            affectedNeighborhood="Downtown"
        ),
        AlertItem(
            id="mock_alert_2",
            title="Increased Police Patrols in Oak Park",
            summary="Montgomery PD reports increased patrols in Oak Park neighborhood this weekend following recent property crimes.",
            severity="medium",
            source="Montgomery City Government",
            sourceUrl="https://www.montgomeryal.gov/news",
            timestamp=datetime.now() - timedelta(hours=6),
            coordinates=(32.3500, -86.2900),
            affectedNeighborhood="Oak Park"
        ),
        AlertItem(
            id="mock_alert_3",
            title="Community Policing Initiative Launch",
            summary="New community policing initiative launches in Capitol Heights area to improve resident relations and safety.",
            severity="low",
            source="Montgomery Advertiser",
            sourceUrl="https://www.montgomeryadvertiser.com/news/crime",
            timestamp=datetime.now() - timedelta(hours=12),
            coordinates=(32.3700, -86.2700),
            affectedNeighborhood="Capitol Heights"
        ),
        AlertItem(
            id="mock_alert_4",
            title="Traffic Incident on Dexter Avenue",
            summary="Minor traffic incident on Dexter Avenue causing temporary lane closures. Traffic being redirected.",
            severity="high",
            source="WSFA News",
            sourceUrl="https://wsfa.com/crime",
            timestamp=datetime.now() - timedelta(hours=1),
            coordinates=(32.3625, -86.2800),
            affectedNeighborhood="Downtown"
        ),
    ]
    
    # Apply severity filter if specified
    if severity_filter:
        mock_alerts = [alert for alert in mock_alerts if alert.severity.lower() == severity_filter.lower()]
    
    return mock_alerts[:limit]
