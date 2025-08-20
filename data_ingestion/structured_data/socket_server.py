"""
Socket.IO server (ASGI) for real-time updates integrated with FastAPI.
Import `socket_app` and mount on a path in api.py
"""
import socketio
from config import Config

# Async ASGI Socket.IO server
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

async def send_update(data):
    await sio.emit('data_update', data)

if __name__ == "__main__":
    # Optional standalone run
    import uvicorn, os
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("SOCKET_IO_PORT", str(Config.SOCKET_IO_PORT)))
    # Minimal ASGI wrapper
    uvicorn.run(socket_app, host=host, port=port)
