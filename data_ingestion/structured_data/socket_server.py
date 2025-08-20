"""
Socket.IO server for real-time updates
"""
import socketio
import eventlet
from config import Config

sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Example event to send data
def send_update(data):
    sio.emit('data_update', data)

if __name__ == "__main__":
    print(f"Starting Socket.IO server on port {Config.SOCKET_IO_PORT}")
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', Config.SOCKET_IO_PORT)), app)
