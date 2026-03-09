# backend/api/routers/vision.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from ..models.schemas import VisionResponse, VisionAnalysisResult, ServiceRequest311
from ..core.config import settings
from datetime import datetime
import httpx
import os
import base64
import io
from PIL import Image

router = APIRouter()

# AI Agents service URL from config
AI_AGENTS_URL = settings.ai_agents_url

@router.post("/vision/analyze", response_model=VisionResponse)
async def analyze_image(
    image: UploadFile = File(...),
    description: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None)
):
    """
    Analyze an image to detect service requests (potholes, graffiti, etc.).
    This endpoint uses direct Gemini Vision API integration.
    """
    MAX_SIZE = 5 * 1024 * 1024  # 5MB

    # === THÊM KIỂM TRA SIZE TRƯỚC KHI READ ===
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Kiểm tra size (FastAPI không tự chặn)
    content = await image.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max 5MB (received {len(content)//(1024*1024)}MB)")

    # Validate thực sự với Pillow (tránh file độc hại)
    try:
        img = Image.open(io.BytesIO(content))
        img_format = img.format or 'JPEG'
        
        # THỢ RÈN: Chặn đứng OOM - Resize ảnh xuống mức an toàn (max 1024px)
        # Tiết kiệm RAM + Token Gemini + Giảm Latency
        max_dim = 1024
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            img.save(output, format=img_format, quality=85)
            content = output.getvalue()
            
        image_base64 = base64.b64encode(content).decode('utf-8')
        
        # Try direct Gemini Vision API first
        result = await _analyze_with_gemini(image_base64, image.content_type, lat, lng, description)
        
        return VisionResponse(result=result)
                
    except Exception as e:
        print(f"Vision analysis error: {e}")
        # Return fallback response on any error
        fallback_result = _get_fallback_vision_analysis(image.filename if image else "unknown", description, lat, lng)
        return VisionResponse(result=fallback_result)

async def _analyze_with_gemini(
    image_base64: str, 
    mime_type: str, 
    lat: Optional[float], 
    lon: Optional[float],
    description: Optional[str]
) -> VisionAnalysisResult:
    """Analyze image using AI Agents service"""
    try:
        # Prepare payload
        payload = {
            "imageBase64": image_base64,
            "mimeType": mime_type,
            "lat": lat,
            "lng": lon
        }
        
        # Call AI agents service
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{AI_AGENTS_URL}/vision/analyze",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": settings.api_key
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Convert to our VisionAnalysisResult format
                return VisionAnalysisResult(
                    incidentType=result.get('incidentType', 'other'),
                    severity=result.get('severity', 'medium'),
                    confidence=result.get('confidence', 0.5),
                    description=result.get('description', 'Image analyzed successfully'),
                    suggested311Category=result.get('prefilledForm', {}).get('serviceType', 'other'),
                    prefilledForm={
                        'serviceType': result.get('prefilledForm', {}).get('serviceType', 'other'),
                        'description': result.get('prefilledForm', {}).get('description', result.get('description', '')),
                        'latitude': lat,
                        'longitude': lon,
                        'estimatedResolutionDays': _get_estimated_days(result.get('incidentType', 'other'))
                    }
                )
            else:
                print(f"AI Agents service error: {response.status_code}")
                raise Exception(f"AI Agents service failed with status {response.status_code}")
        
    except Exception as e:
        print(f"Vision analysis proxy error: {e}")
        raise e

def _get_estimated_days(incident_type: str) -> int:
    """Get estimated resolution days based on incident type"""
    estimates = {
        'pothole': 3,
        'graffiti': 5,
        'trash': 2,
        'flooding': 1,
        'overgrown_grass': 7,
        'other': 5
    }
    return estimates.get(incident_type, 5)

def _get_fallback_vision_analysis(filename: Optional[str], description: Optional[str], lat: Optional[float] = None, lon: Optional[float] = None) -> VisionAnalysisResult:
    """Generate fallback vision analysis when AI service is unavailable"""
    
    # Simple keyword-based analysis as fallback
    desc_lower = (description or "").lower()
    filename_lower = (filename or "").lower()
    
    # Determine incident type based on keywords
    if any(keyword in desc_lower or keyword in filename_lower for keyword in ['pothole', 'road', 'street', 'pavement']):
        incident_type = 'pothole'
        severity = 'medium'
        confidence = 0.7
        suggested_category = 'Street Maintenance - Pothole Repair'
    elif any(keyword in desc_lower or keyword in filename_lower for keyword in ['graffiti', 'vandalism', 'tag', 'spray']):
        incident_type = 'graffiti'
        severity = 'low'
        confidence = 0.8
        suggested_category = 'Public Property - Graffiti Removal'
    elif any(keyword in desc_lower or keyword in filename_lower for keyword in ['trash', 'garbage', 'waste', 'dump']):
        incident_type = 'trash'
        severity = 'medium'
        confidence = 0.6
        suggested_category = 'Sanitation - Trash Collection'
    elif any(keyword in desc_lower or keyword in filename_lower for keyword in ['flood', 'water', 'drainage', 'sewer']):
        incident_type = 'flooding'
        severity = 'high'
        confidence = 0.75
        suggested_category = 'Public Works - Flooding/Drainage'
    else:
        incident_type = 'other'
        severity = 'medium'
        confidence = 0.5
        suggested_category = 'General Service Request'
    
    return VisionAnalysisResult(
        incidentType=incident_type,
        severity=severity,
        confidence=confidence,
        description=f"AI vision service is currently unavailable. Based on your description, this appears to be a {incident_type} issue. A more detailed analysis will be available when the service is restored.",
        suggested311Category=suggested_category,
        prefilledForm={
            "serviceType": incident_type,
            "description": description or f"Image analysis for {incident_type} issue",
            "latitude": lat,
            "longitude": lon,
            "estimatedResolutionDays": _get_estimated_days(incident_type)
        }
    )
