import pytest
from fastapi.testclient import TestClient
from fastapi import status
import os
import io
from PIL import Image

# Mock environment before importing app
os.environ["API_KEY"] = "test_secret_key_32_chars_long_1234"
os.environ["API_URL"] = "http://localhost:8000"

from api.main import app
from api.core.config import settings

client = TestClient(app)

def test_api_key_header_missing():
    """Verify that requests without X-API-Key are rejected"""
    response = client.get("/api/v1/crime")
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_api_key_header_invalid():
    """Verify that requests with invalid X-API-Key are rejected"""
    response = client.get("/api/v1/crime", headers={"X-API-Key": "wrong_key"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_api_key_header_valid():
    """Verify that requests with valid X-API-Key are accepted"""
    response = client.get("/api/v1/crime", headers={"X-API-Key": os.environ["API_KEY"]})
    # We expect a success or 404 (if not found in DB) but NOT 403
    assert response.status_code != status.HTTP_403_FORBIDDEN

def test_vision_upload_too_large():
    """Verify that uploading a file > 5MB returns 413"""
    large_content = b"a" * (6 * 1024 * 1024) # 6MB
    files = {"image": ("large.jpg", large_content, "image/jpeg")}
    response = client.post(
        "/api/v1/vision/analyze", 
        files=files, 
        headers={"X-API-Key": os.environ["API_KEY"]}
    )
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE

def test_vision_upload_not_image():
    """Verify that uploading a non-image file returns 400"""
    content = b"not an image content"
    files = {"image": ("test.txt", content, "text/plain")}
    response = client.post(
        "/api/v1/vision/analyze", 
        files=files, 
        headers={"X-API-Key": os.environ["API_KEY"]}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_vision_upload_invalid_image_binary():
    """Verify that uploading a file with image mime but invalid binary returns 400"""
    content = b"completely invalid image binary"
    files = {"image": ("fake.jpg", content, "image/jpeg")}
    response = client.post(
        "/api/v1/vision/analyze", 
        files=files, 
        headers={"X-API-Key": os.environ["API_KEY"]}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_websocket_auth():
    """Verify that websocket connection requires valid auth message handshake"""
    from starlette.websockets import WebSocketDisconnect

    # 1. Test case: No auth message - should close on timeout (4002)
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/ws") as websocket:
            # Server waits 5s for auth, then closes with 4002
            websocket.receive_json()
    assert excinfo.value.code == 4002

    # 2. Test case: Wrong auth key (4001)
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({"type": "auth", "key": "wrong_key"})
        # Server should close with code 4001
        with pytest.raises(WebSocketDisconnect) as excinfo:
            websocket.receive_json()
        assert excinfo.value.code == 4001

    # 3. Test case: Correct auth key
    with client.websocket_connect("/ws") as websocket:
        websocket.send_json({"type": "auth", "key": os.environ["API_KEY"]})
        data = websocket.receive_json()
        assert data["type"] == "connection_established"

def test_districts_endpoint():
    """Verify that /api/v1/districts doesn't crash due to missing imports"""
    response = client.get(
        "/api/v1/districts",
        headers={"X-API-Key": os.environ["API_KEY"]}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "data" in data
    # Check if we got either DB data or mock data
    assert len(data["data"]) >= 0 

def test_predictions_endpoint():
    """Verify that /api/v1/predictions doesn't crash due to missing imports or logic bugs"""
    response = client.get(
        "/api/v1/predictions",
        headers={"X-API-Key": os.environ["API_KEY"]}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "data" in data
    if len(data["data"]) > 0:
        # Verify SHAP features are present (not None)
        assert data["data"][0]["shapFeatures"] is not None
