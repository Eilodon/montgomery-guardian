# backend/scraper/alert_extractor.py
import os
import google.generativeai as genai
from typing import List
from pydantic import BaseModel, Field
from api.models.schemas import AlertItem

# Cấu hình Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Định nghĩa Schema ép LLM trả về JSON chuẩn
class ExtractedAlert(BaseModel):
    title: str = Field(description="Headline of the incident")
    summary: str = Field(description="Short summary under 200 characters")
    severity: str = Field(description="Must be exactly: critical, high, medium, or low")
    affectedNeighborhood: str | None = Field(description="Specific neighborhood name if mentioned, else null")

class AlertExtractionResult(BaseModel):
    alerts: List[ExtractedAlert]

class AlertExtractor:
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-1.5-flash") if GEMINI_API_KEY else None

    def extract_alerts(self, url: str, content: str) -> List[AlertItem]:
        """AI-Driven Extraction (Zero RegEx)"""
        if not self.model or len(content) < 50:
            return [] # Hoặc fallback về regex cũ nếu cần

        try:
            # Ép cấu trúc xuất bằng response_schema của Gemini
            response = self.model.generate_content(
                f"Extract all public safety alerts, crimes, or incidents from this text.\n\nText: {content[:8000]}",
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=AlertExtractionResult,
                    temperature=0.1
                ),
            )
            
            # Khôi phục từ JSON
            import json
            result_dict = json.loads(response.text)
            extracted_list = result_dict.get("alerts", [])
            
            alerts = []
            for i, item in enumerate(extracted_list):
                alerts.append(AlertItem(
                    id=f"alert_{hash(url + str(i)) % 100000}",
                    title=item["title"][:100],
                    summary=item["summary"][:200],
                    severity=item["severity"].lower() if item["severity"].lower() in ['critical', 'high', 'medium', 'low'] else 'medium',
                    source=self._extract_source_name(url),
                    sourceUrl=url,
                    timestamp=self._get_current_timestamp(),
                    coordinates=None,
                    affectedNeighborhood=item.get("affectedNeighborhood")
                ))
            return alerts
            
        except Exception as e:
            print(f"❌ LLM Extraction failed for {url}: {e}")
            return []

    def _extract_source_name(self, url: str) -> str:
        if 'montgomeryal.gov' in url: return 'Montgomery City Government'
        if 'wsfa.com' in url: return 'WSFA News'
        if 'montgomeryadvertiser.com' in url: return 'Montgomery Advertiser'
        return 'Unknown Source'
        
    def _get_current_timestamp(self):
        from datetime import datetime
        return datetime.now()

alert_extractor = AlertExtractor()

def extract_alerts_from_content(url: str, content: str) -> List[AlertItem]:
    return alert_extractor.extract_alerts(url, content)
