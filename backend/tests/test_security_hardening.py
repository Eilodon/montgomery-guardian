import pytest
from fastapi.testclient import TestClient
from fastapi import status
import os
import io
from PIL import Image

# Mock environment before importing app
os.environ["API_KEY"] = "test_secret_key_12345678901234567890"
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
    """Verify that websocket connection requires valid api key in query param"""
    # TestClient for websocket handles it slightly differently, but we can check the close logic
    with pytest.raises(Exception): # TestClient might raise if handshake fails
         with client.websocket_connect("/ws") as websocket:
             pass

    with pytest.raises(Exception):
         with client.websocket_connect("/ws?x_api_key=wrong") as websocket:
             pass
