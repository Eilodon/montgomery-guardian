# backend/api/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..models.schemas import ChatResponse, AgentMessage
from ..core.config import settings
from datetime import datetime
import httpx

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    language: str = "en"
    agent_type: Optional[str] = None
    userLocation: Optional[dict] = None
    context: Optional[dict] = None

# AI Agents service URL from config
AI_AGENTS_URL = settings.ai_agents_url

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Chat with AI agents for safety intelligence, 311 services, vision analysis, or web scraping.
    This endpoint proxies requests to the AI agents service.
    """
    try:
        # Determine agent type if not specified
        agent_type = request.agent_type or _determine_agent_type(request.message)
        
        # Prepare payload for AI agents service
        payload = {
            "message": request.message,
            "history": request.history,
            "language": request.language,
            "agent_type": agent_type,
            "user_location": request.userLocation,
            "context": request.context or {},
            "timestamp": datetime.now().isoformat()
        }
        
        # Proxy request to AI agents service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{AI_AGENTS_URL}/chat",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": settings.api_key
                }
            )
            
            if response.status_code == 200:
                ai_response = response.json()
                
                # Convert to our AgentMessage format
                agent_message = AgentMessage(
                    role="assistant",
                    content=ai_response.get("content", "I'm sorry, I couldn't process your request."),
                    agentType=ai_response.get("agent_type", agent_type),
                    timestamp=datetime.fromisoformat(ai_response.get("timestamp", datetime.now().isoformat())),
                    metadata=ai_response.get("metadata")
                )
                
                return ChatResponse(message=agent_message)
            else:
                # Fallback response if AI agents service is unavailable
                fallback_response = _get_fallback_response(request.message, agent_type)
                return ChatResponse(message=fallback_response)
                
    except Exception as e:
        # Return fallback response on any error
        fallback_response = _get_fallback_response(request.message, request.agent_type or "safety_intel")
        return ChatResponse(message=fallback_response)

def _determine_agent_type(message: str) -> str:
    """Automatically determine which agent should handle the message"""
    message_lower = message.lower()
    
    # Keywords for different agent types
    safety_keywords = ['crime', 'safety', 'police', 'danger', 'risk', 'incident', 'emergency']
    service_311_keywords = ['pothole', 'graffiti', 'trash', 'flood', 'service', 'request', '311']
    vision_keywords = ['photo', 'image', 'picture', 'analyze', 'see', 'look at']
    web_keywords = ['news', 'scrape', 'website', 'article', 'update', 'current']
    
    if any(keyword in message_lower for keyword in vision_keywords):
        return 'vision'
    elif any(keyword in message_lower for keyword in service_311_keywords):
        return 'service_311'
    elif any(keyword in message_lower for keyword in web_keywords):
        return 'web_scraper'
    else:
        return 'safety_intel'

def _get_fallback_response(message: str, agent_type: str) -> AgentMessage:
    """Generate fallback response when AI agents service is unavailable"""
    
    fallback_responses = {
        'safety_intel': "I'm currently unable to access real-time safety data. Please check the Montgomery Police Department website for official crime information, or try the /api/v1/crime endpoint for historical data.",
        
        'service_311': "I'm having trouble connecting to the 311 service system right now. You can submit service requests directly through the Montgomery 311 website or call 311 for immediate assistance.",
        
        'vision': "The vision analysis service is temporarily unavailable. Please try again later or contact support if you need immediate assistance with image analysis.",
        
        'web_scraper': "I'm currently unable to scrape web content for the latest updates. Please check the Montgomery city website and local news sources directly for current information."
    }
    
    content = fallback_responses.get(agent_type, "I'm experiencing technical difficulties. Please try again later.")
    
    return AgentMessage(
        role="assistant",
        content=content,
        agentType=agent_type,
        timestamp=datetime.now(),
        metadata={"error": "ai_agents_unavailable"}
    )
