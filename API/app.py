import os
from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv

# Importy Twoich modułów
from db import init_db
from routes.lobby import lobby_bp
from sockets.game import register_game_sockets

load_dotenv()

app = Flask(__name__)

cors_origin = ["http://localhost:3000", "https://twoja-gra.vercel.app", "http://192.168.100.2:3000"]

CORS(app, resources={r"/*": {
    "origins": cors_origin,
    "methods": ["GET", "POST"],
    "allow_headers": ["Content-Type"]
}})

socketio = SocketIO(app, cors_allowed_origins=cors_origin)

# Dodaj tę trasę, aby uniknąć 404 na stronie głównej
@app.route('/')
def health_check():
    return jsonify({"status": "Saloon is open!", "version": "1.0.0"})

# Rejestracja tras API
app.register_blueprint(lobby_bp, url_prefix='/api/lobby')

# Rejestracja zdarzeń Socket.io
register_game_sockets(socketio)

if __name__ == '__main__':
    init_db()
    port = int(os.getenv('PORT', 3001))
    port = int(os.environ.get("PORT", 3001))
    socketio.run(app, host='0.0.0.0', port=port)