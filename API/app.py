import os
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv

from db import init_db
from routes.lobby import lobby_bp
from sockets.game import register_game_sockets

load_dotenv()

app = Flask(__name__)
# CORS_ORIGIN pobierany z .env
CORS(app, resources={r"/*": {"origins": os.getenv('CORS_ORIGIN')}})
socketio = SocketIO(app, cors_allowed_origins=os.getenv('CORS_ORIGIN'))

# Rejestracja tras API
app.register_blueprint(lobby_bp, url_prefix='/api/lobby')

# Rejestracja zdarzeń Socket.io
register_game_sockets(socketio)

if __name__ == '__main__':
    init_db()  # Inicjalizacja bazy przy starcie
    port = int(os.getenv('PORT', 3001))
    print(f"Serwer działa na porcie {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True)