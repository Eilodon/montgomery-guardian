import asyncio
import websockets
import json
import time

async def test_websocket_heartbeat():
    uri = "ws://localhost:8001/ws" 
    print(f"🧪 Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            # 1. Send auth
            await websocket.send(json.dumps({"type": "auth", "key": "ba8763597b876359ba8763597b876359"}))
            resp = await websocket.recv()
            print(f"✅ Auth response: {resp}")
            
            # 2. Chờ ping từ server (Heartbeat loop chạy mỗi 30s)
            print("⏳ Waiting for heartbeat ping from server (this may take up to 40s)...")
            start_time = time.time()
            while time.time() - start_time < 45:
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    if msg == "ping":
                        print("✅ Received Heartbeat PING from server!")
                        # Giả lập client KHÔNG phản hồi (hoặc chỉ nhận)
                        # Server sẽ monitor nếu có exception khi gửi
                        break
                    else:
                        print(f"📩 Received other message: {msg}")
                except asyncio.TimeoutError:
                    continue
            else:
                print("❌ No heartbeat ping received within timeout.")

    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    # Lưu ý: Backend server (FastAPI) phải đang chạy cổng 8001
    try:
        asyncio.run(test_websocket_heartbeat())
    except KeyboardInterrupt:
        pass
