# backend/scraper/alert_extractor.py
import re
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from api.models.schemas import AlertItem

class AlertExtractor:
    def __init__(self):
        self.alert_keywords = {
            'critical': [
                'emergency', 'evacuation', 'lockdown', 'shooting', 'hostage',
                'bomb threat', 'terrorist', 'active shooter', 'civil unrest',
                'chemical spill', 'explosion', 'structural collapse'
            ],
            'high': [
                'accident', 'crash', 'collision', 'road closure', 'detour',
                'police activity', 'investigation', 'suspect', 'arrest',
                'fire', 'hazard', 'dangerous', 'unsafe', 'warning'
            ],
            'medium': [
                'incident', 'disturbance', 'theft', 'burglary', 'vandalism',
                'delay', 'disruption', 'maintenance', 'construction',
                'safety', 'security', 'patrol', 'checkpoint'
            ],
            'low': [
                'update', 'announcement', 'information', 'reminder',
                'community', 'meeting', 'event', 'service', 'schedule'
            ]
        }
        
        self.location_patterns = [
            r'\b(?:Downtown|Capitol Heights|Oak Park|Garden District|Cloverdale|Old Cloverdale|Bellevue|Chisholm|Highland Park|Tulane|Washington Park|Wyndridge)\b',
            r'\b\d+\s+(?:St|Ave|Dr|Blvd|Rd|Lane|Court|Circle|Square|Way)\b',
            r'\bI-?\d+\b',
            r'\bUS-?\d+\b',
            r'\bAL-?\d+\b'
        ]

    def extract_alerts(self, url: str, content: str) -> List[AlertItem]:
        """Extract alerts from scraped content"""
        alerts = []
        
        # Split content into sections
        sections = self._split_content(content)
        
        for i, section in enumerate(sections):
            alert = self._extract_alert_from_section(url, section, i)
            if alert:
                alerts.append(alert)
        
        return alerts

    def _split_content(self, content: str) -> List[str]:
        """Split content into manageable sections"""
        # Split by headings and paragraphs
        sections = []
        
        # Split by markdown headers
        header_splits = re.split(r'\n#{1,3}\s+', content)
        
        for split in header_splits:
            # Further split by paragraphs
            paragraphs = re.split(r'\n\n+', split.strip())
            sections.extend([p.strip() for p in paragraphs if p.strip()])
        
        return sections

    def _extract_alert_from_section(self, url: str, section: str, index: int) -> Optional[AlertItem]:
        """Extract alert from a single content section"""
        if len(section) < 20:  # Skip very short sections
            return None
        
        # Determine severity
        severity = self._determine_severity(section)
        
        # Extract title and summary
        title = self._extract_title(section)
        summary = self._extract_summary(section)
        
        # Extract location information
        coordinates = self._extract_coordinates(section)
        neighborhood = self._extract_neighborhood(section)
        
        # Generate unique ID
        alert_id = f"alert_{hash(url + str(index)) % 100000}"
        
        return AlertItem(
            id=alert_id,
            title=title,
            summary=summary,
            severity=severity,
            source=self._extract_source_name(url),
            sourceUrl=url,
            timestamp=self._extract_timestamp(section),
            coordinates=coordinates,
            affectedNeighborhood=neighborhood
        )

    def _determine_severity(self, text: str) -> str:
        """Determine alert severity based on keywords"""
        text_lower = text.lower()
        
        # Check for critical keywords first
        for keyword in self.alert_keywords['critical']:
            if keyword in text_lower:
                return 'critical'
        
        # Check for high keywords
        for keyword in self.alert_keywords['high']:
            if keyword in text_lower:
                return 'high'
        
        # Check for medium keywords
        for keyword in self.alert_keywords['medium']:
            if keyword in text_lower:
                return 'medium'
        
        # Default to low
        return 'low'

    def _extract_title(self, section: str) -> str:
        """Extract title from section"""
        lines = section.split('\n')
        
        # First line is usually the title
        if lines:
            title = lines[0].strip()
            # Remove markdown formatting
            title = re.sub(r'^#+\s*', '', title)
            title = re.sub(r'\*\*(.*?)\*\*', r'\1', title)
            return title[:100]  # Truncate long titles
        
        return "Untitled Alert"

    def _extract_summary(self, section: str) -> str:
        """Extract summary from section"""
        # Remove title if present
        lines = section.split('\n')
        if lines:
            summary_lines = lines[1:]  # Skip first line (title)
        else:
            summary_lines = []
        
        # Join remaining lines and clean up
        summary = ' '.join(summary_lines)
        summary = re.sub(r'\*\*(.*?)\*\*', r'\1', summary)  # Remove bold markdown
        summary = re.sub(r'\*(.*?)\*', r'\1', summary)  # Remove italic markdown
        summary = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', summary)  # Remove markdown links
        
        return summary[:200].strip()  # Truncate long summaries

    def _extract_coordinates(self, text: str) -> Optional[tuple[float, float]]:
        """Extract coordinates from text (placeholder for future implementation)"""
        # This would require more sophisticated geocoding
        # For now, return None
        return None

    def _extract_neighborhood(self, text: str) -> Optional[str]:
        """Extract neighborhood names from text"""
        neighborhoods = [
            'Downtown', 'Capitol Heights', 'Oak Park', 'Garden District',
            'Cloverdale', 'Old Cloverdale', 'Bellevue', 'Chisholm',
            'Highland Park', 'Tulane', 'Washington Park', 'Wyndridge'
        ]
        
        text_lower = text.lower()
        for neighborhood in neighborhoods:
            if neighborhood.lower() in text_lower:
                return neighborhood
        
        return None

    def _extract_source_name(self, url: str) -> str:
        """Extract friendly source name from URL"""
        if 'montgomeryal.gov' in url:
            return 'Montgomery City Government'
        elif 'wsfa.com' in url:
            return 'WSFA News'
        elif 'montgomeryadvertiser.com' in url:
            return 'Montgomery Advertiser'
        else:
            return 'Unknown Source'

    def _extract_timestamp(self, text: str) -> datetime:
        """Extract timestamp from text"""
        # Look for time-related keywords
        time_patterns = [
            r'\b(?:just now|recently|breaking)\b',
            r'\b\d+\s+(?:minutes?|hours?|days?)\s+ago\b',
            r'\b(?:today|yesterday|this week)\b',
            r'\b\d{1,2}/\d{1,2}/\d{4}\b',
            r'\b\d{4}-\d{2}-\d{2}\b'
        ]
        
        text_lower = text.lower()
        
        # Simple heuristic based on keywords
        if any(pattern in text_lower for pattern in ['just now', 'recently', 'breaking']):
            return datetime.now() - timedelta(minutes=30)
        elif 'hour' in text_lower:
            return datetime.now() - timedelta(hours=1)
        elif 'yesterday' in text_lower:
            return datetime.now() - timedelta(days=1)
        elif 'today' in text_lower:
            return datetime.now() - timedelta(hours=3)
        else:
            return datetime.now() - timedelta(hours=6)

# Global extractor instance
alert_extractor = AlertExtractor()

def extract_alerts_from_content(url: str, content: str) -> List[AlertItem]:
    """Convenience function to extract alerts"""
    return alert_extractor.extract_alerts(url, content)
