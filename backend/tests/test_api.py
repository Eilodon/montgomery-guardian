# backend/tests/test_api.py
import pytest
import asyncio
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.main import app

# Montgomery Guardian API Key for testing - should be provided via environment
API_KEY = os.environ.get("API_KEY", "test_secret_key_32_chars_long_1234")
client = TestClient(app, headers={"X-API-Key": API_KEY})

class TestHealthEndpoint:
    def test_health_check(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "montgomery-guardian-api"

class TestCrimeEndpoint:
    def test_get_crime_incidents(self):
        """Test getting crime incidents"""
        response = client.get("/api/v1/crime?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)
        
        # Check data structure if not empty
        if data["data"]:
            incident = data["data"][0]
            required_fields = ["id", "type", "latitude", "longitude", "neighborhood", "timestamp", "status"]
            for field in required_fields:
                assert field in incident

    def test_get_crime_with_neighborhood_filter(self):
        """Test getting crime incidents with neighborhood filter"""
        response = client.get("/api/v1/crime?neighborhood=Downtown&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    def test_get_crime_with_pagination(self):
        """Test pagination for crime incidents"""
        response = client.get("/api/v1/crime?limit=2&offset=1")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

class TestRequests311Endpoint:
    def test_get_311_requests(self):
        """Test getting 311 service requests"""
        response = client.get("/api/v1/requests?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)
        
        # Check data structure if not empty
        if data["data"]:
            request = data["data"][0]
            required_fields = ["requestId", "serviceType", "status", "latitude", "longitude", "address", "createdAt", "updatedAt"]
            for field in required_fields:
                assert field in request

    def test_get_311_with_service_type_filter(self):
        """Test getting 311 requests with service type filter"""
        response = client.get("/api/v1/requests?service_type=pothole&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    def test_get_311_with_status_filter(self):
        """Test getting 311 requests with status filter"""
        response = client.get("/api/v1/requests?status=open&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

class TestPredictionsEndpoint:
    def test_get_risk_predictions(self):
        """Test getting risk predictions"""
        response = client.get("/api/v1/predictions?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)
        
        # Check data structure if not empty
        if data["data"]:
            prediction = data["data"][0]
            required_fields = ["gridCellId", "latitude", "longitude", "riskLevel", "confidenceScore", "forecastHours", "shapFeatures", "generatedAt"]
            for field in required_fields:
                assert field in prediction

    def test_get_predictions_with_risk_level_filter(self):
        """Test getting predictions with risk level filter"""
        response = client.get("/api/v1/predictions?risk_level=high&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    def test_get_predictions_with_forecast_hours(self):
        """Test getting predictions with specific forecast hours"""
        response = client.get("/api/v1/predictions?forecast_hours=48&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    def test_get_heatmap(self):
        """Test getting heatmap data (prefixed route)"""
        response = client.get("/api/v1/predictions/heatmap")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_simulate_impact(self):
        """Test simulating impact (prefixed route)"""
        payload = {
            "patrolCoverage": 80,
            "backlogLevel": 20
        }
        response = client.post("/api/v1/predictions/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "projectedImpact" in data

    def test_get_shap_explainability(self):
        """Test getting SHAP data (prefixed route)"""
        response = client.get("/api/v1/predictions/explain")
        assert response.status_code == 200
        assert "features" in response.json()

class TestAlertsEndpoint:
    def test_get_alerts(self):
        """Test getting safety alerts"""
        response = client.get("/api/v1/alerts?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)
        
        # Check data structure if not empty
        if data["data"]:
            alert = data["data"][0]
            required_fields = ["id", "title", "summary", "severity", "source", "timestamp"]
            for field in required_fields:
                assert field in alert

    def test_get_alerts_with_severity_filter(self):
        """Test getting alerts with severity filter"""
        response = client.get("/api/v1/alerts?severity=high&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

class TestChatEndpoint:
    def test_chat_with_agent(self):
        """Test chat functionality with AI agents"""
        payload = {
            "message": "What is the current crime situation in Downtown?",
            "agent_type": "safety_intel",
            "language": "en"
        }
        response = client.post("/api/v1/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "message" in data
        message = data["message"]
        required_fields = ["role", "content", "agentType", "timestamp"]
        for field in required_fields:
            assert field in message
        assert message["role"] == "assistant"

    def test_chat_with_history_and_context(self):
        """Test chat with history and user location context"""
        payload = {
            "message": "Tell me more about the first point",
            "history": [
                {"role": "user", "content": "What are the common crimes here?"},
                {"role": "assistant", "content": "Common crimes include property theft and burglary."}
            ],
            "userLocation": {"lat": 32.3617, "lng": -86.2792},
            "language": "vi"
        }
        response = client.post("/api/v1/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_chat_without_agent_type(self):
        """Test chat without specifying agent type (auto-detection)"""
        payload = {
            "message": "There's a pothole on Main Street"
        }
        response = client.post("/api/v1/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

class TestVisionEndpoint:
    def test_vision_analyze_without_image(self):
        """Test vision analysis endpoint without image (should fail)"""
        response = client.post("/api/v1/vision/analyze")
        assert response.status_code == 422  # Validation error

    def test_vision_analyze_with_mock_data(self):
        """Test vision analysis with mock image data"""
        # This test would need actual image data in a real scenario
        # For now, we'll test the endpoint structure
        import io
        from PIL import Image
        
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {"image": ("test.jpg", img_bytes, "image/jpeg")}
        data = {
            "description": "Large pothole in the road",
            "lat": "32.3617",
            "lng": "-86.2792"
        }
        
        response = client.post("/api/v1/vision/analyze", files=files, data=data)
        assert response.status_code == 200
        response_data = response.json()
        
        # Check response structure
        assert "result" in response_data
        result = response_data["result"]
        required_fields = ["incidentType", "severity", "confidence", "description", "suggested311Category", "prefilledForm"]
        for field in required_fields:
            assert field in result

class TestCORSHeaders:
    def test_cors_headers(self):
        """Test that CORS headers are properly set"""
        response = client.options("/health", headers={"Origin": "http://localhost:3000"})
        # Check for CORS headers
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

class TestErrorHandling:
    def test_invalid_endpoint(self):
        """Test that invalid endpoints return proper error responses"""
        response = client.get("/api/v1/invalid-endpoint")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_invalid_query_parameters(self):
        """Test handling of invalid query parameters"""
        response = client.get("/api/v1/crime?limit=invalid")
        # This should still work due to FastAPI's validation
        assert response.status_code == 422  # Validation error

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
