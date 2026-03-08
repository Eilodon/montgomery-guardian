#!/usr/bin/env python3
"""
WebSocket Manager for Montgomery Guardian
Real-time updates for crime, 311 requests, and alerts
"""

import json
import logging
import asyncio
from typing import Dict, List, Any, Set
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        """Initialize connection manager"""
        self.active_connections: Dict[str, WebSocketServerProtocol] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.rooms: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocketServerProtocol, connection_id: str, metadata: Dict[str, Any] = None):
        """Accept new WebSocket connection"""
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = metadata or {}
        
        # Add to default room
        await self.join_room(connection_id, "general")
        
        logger.info(f"WebSocket connected: {connection_id}")
        
        # Send welcome message
        await self.send_to_connection(connection_id, {
            "type": "connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat(),
            "server_info": {
                "version": "1.0.0",
                "features": ["crime_updates", "311_updates", "alerts", "predictions"]
            }
        })
    
    async def disconnect(self, connection_id: str):
        """Remove WebSocket connection"""
        if connection_id in self.active_connections:
            # Remove from all rooms
            metadata = self.connection_metadata.get(connection_id, {})
            rooms = metadata.get('rooms', [])
            for room in rooms:
                await self.leave_room(connection_id, room)
            
            del self.active_connections[connection_id]
            del self.connection_metadata[connection_id]
            
            logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def join_room(self, connection_id: str, room: str):
        """Add connection to a room"""
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
        """Remove connection from a room"""
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
                await self.active_connections[connection_id].send(json.dumps(message))
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
                    await self.active_connections[connection_id].send(json.dumps(message))
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
                await websocket.send(json.dumps(message))
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


class WebSocketManager:
    """Main WebSocket manager for real-time updates"""
    
    def __init__(self, connection_manager: ConnectionManager):
        """Initialize WebSocket manager"""
        self.connection_manager = connection_manager
        self.is_running = False
        self.update_tasks = []
        logger.info("WebSocket manager initialized")
    
    async def start_server(self, host: str = "localhost", port: int = 8765):
        """Start WebSocket server"""
        self.is_running = True
        
        async def handle_client(websocket: WebSocketServerProtocol, path: str):
            """Handle new WebSocket client"""
            connection_id = f"conn_{len(self.connection_manager.active_connections)}_{datetime.now().timestamp()}"
            
            # Wait for initial message with metadata
            try:
                initial_message = await websocket.recv()
                metadata = json.loads(initial_message)
            except:
                metadata = {}
            
            await self.connection_manager.connect(websocket, connection_id, metadata)
            
            # Handle messages from client
            try:
                async for message in websocket:
                    await self.handle_client_message(connection_id, message)
            except websockets.exceptions.ConnectionClosed:
                await self.connection_manager.disconnect(connection_id)
            except Exception as e:
                logger.error(f"Error handling client {connection_id}: {e}")
                await self.connection_manager.disconnect(connection_id)
        
        # Start server
        logger.info(f"Starting WebSocket server on {host}:{port}")
        
        async with websockets.serve(handle_client, host, port) as server:
            await server.wait_closed()
    
    async def handle_client_message(self, connection_id: str, message: str):
        """Handle messages from WebSocket clients"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'join_room':
                room = data.get('room')
                if room:
                    await self.connection_manager.join_room(connection_id, room)
            
            elif message_type == 'leave_room':
                room = data.get('room')
                if room:
                    await self.connection_manager.leave_room(connection_id, room)
            
            elif message_type == 'subscribe':
                subscriptions = data.get('subscriptions', [])
                for subscription in subscriptions:
                    await self.connection_manager.join_room(connection_id, subscription)
            
            elif message_type == 'unsubscribe':
                subscriptions = data.get('subscriptions', [])
                for subscription in subscriptions:
                    await self.connection_manager.leave_room(connection_id, subscription)
            
            elif message_type == 'ping':
                await self.connection_manager.send_to_connection(connection_id, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from {connection_id}: {message}")
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
    
    async def start_background_updates(self):
        """Start background update tasks"""
        if not self.is_running:
            return
        
        # Start update tasks
        self.update_tasks = [
            asyncio.create_task(self.crime_update_loop()),
            asyncio.create_task(self.alert_update_loop()),
            asyncio.create_task(self.traffic_update_loop()),
            asyncio.create_task(self.system_status_loop())
        ]
        
        logger.info("Background update tasks started")
    
    async def stop_background_updates(self):
        """Stop background update tasks"""
        self.is_running = False
        
        for task in self.update_tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.update_tasks.clear()
        logger.info("Background update tasks stopped")
    
    async def crime_update_loop(self):
        """Periodic crime data updates"""
        while self.is_running:
            try:
                # Simulate new crime data
                await asyncio.sleep(30)  # Update every 30 seconds
                
                # Generate mock crime update
                crime_update = {
                    "type": "crime_update",
                    "data": {
                        "id": f"crime_{datetime.now().timestamp()}",
                        "type": "property",
                        "severity": "medium",
                        "location": "Downtown Montgomery",
                        "latitude": 32.3617 + (hash(str(datetime.now())) % 100) * 0.001,
                        "longitude": -86.2792 + (hash(str(datetime.now())) % 100) * 0.001,
                        "timestamp": datetime.now().isoformat(),
                        "description": "New incident reported"
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.connection_manager.send_to_room("crime_updates", crime_update)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in crime update loop: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def alert_update_loop(self):
        """Periodic alert updates"""
        while self.is_running:
            try:
                await asyncio.sleep(60)  # Update every minute
                
                # Check for critical alerts (mock implementation)
                if datetime.now().minute % 10 == 0:  # Every 10 minutes
                    alert_update = {
                        "type": "alert_update",
                        "data": {
                            "id": f"alert_{datetime.now().timestamp()}",
                            "severity": "high",
                            "category": "traffic",
                            "title": "Traffic Alert",
                            "description": "Heavy congestion reported on I-65",
                            "location": "I-65 Northbound",
                            "timestamp": datetime.now().isoformat()
                        },
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    await self.connection_manager.send_to_room("alerts", alert_update)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in alert update loop: {e}")
                await asyncio.sleep(60)
    
    async def traffic_update_loop(self):
        """Periodic traffic updates"""
        while self.is_running:
            try:
                await asyncio.sleep(45)  # Update every 45 seconds
                
                traffic_update = {
                    "type": "traffic_update",
                    "data": {
                        "id": f"traffic_{datetime.now().timestamp()}",
                        "severity": "medium",
                        "location": "Downtown Area",
                        "impact": "Moderate delays",
                        "estimated_clearance": (datetime.now() + timedelta(hours=2)).isoformat(),
                        "timestamp": datetime.now().isoformat()
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.connection_manager.send_to_room("traffic_updates", traffic_update)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in traffic update loop: {e}")
                await asyncio.sleep(60)
    
    async def system_status_loop(self):
        """Periodic system status updates"""
        while self.is_running:
            try:
                await asyncio.sleep(300)  # Update every 5 minutes
                
                stats = self.connection_manager.get_connection_stats()
                system_status = {
                    "type": "system_status",
                    "data": {
                        "server_status": "healthy",
                        "active_connections": stats["total_connections"],
                        "room_counts": stats["rooms"],
                        "uptime": "operational",
                        "last_update": datetime.now().isoformat()
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.connection_manager.broadcast(system_status)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in system status loop: {e}")
                await asyncio.sleep(300)


# Global instances
connection_manager = ConnectionManager()
websocket_manager = WebSocketManager(connection_manager)

def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager"""
    return connection_manager

def get_websocket_manager() -> WebSocketManager:
    """Get the global WebSocket manager"""
    return websocket_manager


# API endpoint functions
async def handle_websocket_connection(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle WebSocket connection requests"""
    try:
        connection_id = request_data.get('connection_id')
        metadata = request_data.get('metadata', {})
        
        if not connection_id:
            return {
                'success': False,
                'error': 'connection_id is required',
                'timestamp': datetime.now().isoformat()
            }
        
        # This would be handled by the WebSocket server
        # For API responses, return connection info
        return {
            'success': True,
            'connection_id': connection_id,
            'websocket_url': 'ws://localhost:8765',
            'rooms_available': ['general', 'crime_updates', '311_updates', 'alerts', 'traffic_updates'],
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"WebSocket connection request failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


async def broadcast_crime_update(crime_data: Dict[str, Any]):
    """Broadcast crime update to all connected clients"""
    try:
        message = {
            "type": "crime_update",
            "data": crime_data,
            "timestamp": datetime.now().isoformat()
        }
        await connection_manager.send_to_room("crime_updates", message)
        return {
            'success': True,
            'recipients': len(connection_manager.rooms.get("crime_updates", set())),
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
        await connection_manager.send_to_room("alerts", message)
        return {
            'success': True,
            'recipients': len(connection_manager.rooms.get("alerts", set())),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to broadcast alert: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


if __name__ == "__main__":
    # Test WebSocket manager
    async def test_websocket():
        # Start background updates
        await websocket_manager.start_background_updates()
        
        # Simulate some updates
        await asyncio.sleep(5)
        await broadcast_crime_update({
            "id": "test_crime_1",
            "type": "violent",
            "severity": "high",
            "location": "Test Location",
            "timestamp": datetime.now().isoformat()
        })
        
        await asyncio.sleep(2)
        await broadcast_alert({
            "id": "test_alert_1",
            "severity": "critical",
            "title": "Test Alert",
            "description": "This is a test alert",
            "timestamp": datetime.now().isoformat()
        })
        
        print("WebSocket test completed. Press Ctrl+C to stop.")
        
        # Keep running
        while True:
            await asyncio.sleep(1)
    
    try:
        asyncio.run(test_websocket())
    except KeyboardInterrupt:
        print("Shutting down WebSocket server...")
        await websocket_manager.stop_background_updates()
