# backend/api/websocket_manager.py
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Set
from fastapi import WebSocket, WebSocketDisconnect
from ..core.redis import redis_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, connection_id: str, metadata: Dict = None):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = metadata or {}
        await self.join_room(connection_id, "general")
        
        await self.send_to_connection(connection_id, {
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat(),
            "server_info": {"version": "1.0.0", "features": ["crime_updates", "311_updates", "alerts"]}
        })
        logger.info(f"WebSocket connected: {connection_id}")

    async def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            await self.leave_room(connection_id, "general")
            del self.active_connections[connection_id]
            del self.connection_metadata[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id}")

    async def join_room(self, connection_id: str, room: str):
        if room not in self.rooms: 
            self.rooms[room] = set()
        self.rooms[room].add(connection_id)
        
        # Update connection metadata
        if connection_id not in self.connection_metadata:
            self.connection_metadata[connection_id] = {}
        if 'rooms' not in self.connection_metadata[connection_id]:
            self.connection_metadata[connection_id]['rooms'] = set()
        self.connection_metadata[connection_id]['rooms'].add(room)
        
        # Notify room
        await self.send_to_room(room, {
            "type": "user_joined",
            "connection_id": connection_id,
            "room": room,
            "timestamp": datetime.now().isoformat(),
            "room_members": len(self.rooms[room])
        }, exclude_connection=connection_id)
        
        logger.info(f"Connection {connection_id} joined room {room}")

    async def leave_room(self, connection_id: str, room: str):
        if room in self.rooms and connection_id in self.rooms[room]:
            self.rooms[room].remove(connection_id)
            
            # Clean up empty rooms
            if len(self.rooms[room]) == 0:
                del self.rooms[room]
            
            # Update connection metadata
            if connection_id in self.connection_metadata and 'rooms' in self.connection_metadata[connection_id]:
                self.connection_metadata[connection_id]['rooms'].discard(room)
            
            # Notify room
            await self.send_to_room(room, {
                "type": "user_left",
                "connection_id": connection_id,
                "room": room,
                "timestamp": datetime.now().isoformat(),
                "room_members": len(self.rooms.get(room, set()))
            }, exclude_connection=connection_id)
            
            logger.info(f"Connection {connection_id} left room {room}")

    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to {connection_id}: {e}")
    
    async def send_to_room(self, room: str, message: Dict[str, Any], exclude_connection: str = None):
        """Send message to all connections in a room"""
        if room not in self.rooms:
            return
        
        disconnected = []
        for connection_id in self.rooms[room]:
            if connection_id != exclude_connection:
                try:
                    await self.active_connections[connection_id].send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send to {connection_id} in room {room}: {e}")
                    disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for conn_id in disconnected:
            await self.disconnect(conn_id)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to {connection_id}: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for conn_id in disconnected:
            await self.disconnect(conn_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "rooms": {room: len(members) for room, members in self.rooms.items()},
            "timestamp": datetime.now().isoformat()
        }

    async def handle_client_message(self, connection_id: str, message: str):
        """Handle messages from WebSocket clients"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'join_room':
                room = data.get('room')
                if room:
                    await self.join_room(connection_id, room)
            
            elif message_type == 'leave_room':
                room = data.get('room')
                if room:
                    await self.leave_room(connection_id, room)
            
            elif message_type == 'subscribe':
                subscriptions = data.get('subscriptions', [])
                for subscription in subscriptions:
                    await self.join_room(connection_id, subscription)
            
            elif message_type == 'unsubscribe':
                subscriptions = data.get('subscriptions', [])
                for subscription in subscriptions:
                    await self.leave_room(connection_id, subscription)
            
            elif message_type == 'ping':
                await self.send_to_connection(connection_id, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from {connection_id}: {message}")
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")

# Global
manager = ConnectionManager()

# FastAPI WebSocket endpoint
async def websocket_endpoint(websocket: WebSocket):
    connection_id = f"conn_{len(manager.active_connections)}_{datetime.now().timestamp()}"
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_client_message(connection_id, data)
    except WebSocketDisconnect:
        await manager.disconnect(connection_id)

# Helper functions for broadcasting
async def broadcast_crime_update(crime_data: Dict[str, Any]):
    """Broadcast crime update to all connected clients"""
    try:
        message = {
            "type": "crime_update",
            "data": crime_data,
            "timestamp": datetime.now().isoformat()
        }
        await manager.send_to_room("crime_updates", message)
        return {
            'success': True,
            'recipients': len(manager.rooms.get("crime_updates", set())),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to broadcast crime update: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

async def broadcast_alert(alert_data: Dict[str, Any]):
    """Broadcast alert to all connected clients"""
    try:
        message = {
            "type": "alert_update",
            "data": alert_data,
            "timestamp": datetime.now().isoformat()
        }
        await manager.send_to_room("alerts", message)
        return {
            'success': True,
            'recipients': len(manager.rooms.get("alerts", set())),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to broadcast alert: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
