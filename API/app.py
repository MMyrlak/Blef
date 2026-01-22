import os
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

from db import init_db
from routes.lobby import lobby_bp
from sockets.game import register_game_sockets

app = Flask(__name__)

cors_allowed = "*"

CORS(app, resources={r"/*": {
    "origins": cors_allowed,
    "methods": ["GET", "POST"],
    "allow_headers": ["Content-Type"]
}})


socketio = SocketIO(
    app, 
    cors_allowed_origins=cors_allowed, 
    async_mode='eventlet',
    logger=True, 
    engineio_logger=True
)


@app.route('/')
def main_index():
    return jsonify({
        "status": "Saloon is open!",
        "version": "1.0.0",
        "message": "Welcome to the Blef API"
    }), 200

@app.route('/health')
def saloon_health():
    """Trasa używana przez frontend do wybudzania serwera."""
    return jsonify({"status": "Saloon is open!"}), 200

app.register_blueprint(lobby_bp, url_prefix='/api/lobby')

register_game_sockets(socketio)


if __name__ == '__main__':
    init_db()
    
    port = int(os.environ.get("PORT", 3001))
    
    print(f"--- SERWER STARTUJE NA PORCIE {port} ---")
    socketio.run(app, host='0.0.0.0', port=port)