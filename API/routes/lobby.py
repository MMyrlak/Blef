import uuid
from flask import Blueprint, jsonify
from db import get_db_connection

lobby_bp = Blueprint('lobby', __name__)

@lobby_bp.route('/create', methods=['POST'])
def create_lobby():
    lobby_id = str(uuid.uuid4()) # Odpowiednik crypto.randomUUID()
    conn = get_db_connection()
    conn.execute('INSERT INTO lobbies (id, isOpen) VALUES (?, 1)', (lobby_id,))
    conn.commit()
    conn.close()
    return jsonify({"lobbyId": lobby_id})

@lobby_bp.route('/getLobby', methods=['GET'])
def get_lobbies():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM lobbies WHERE isOpen = 1').fetchall()
        conn.close()
        
        if not rows:
            return jsonify({"error": "Brak lobby"}), 404
        
        return jsonify({"rows": [dict(row) for row in rows]})
    except Exception as e:
        print(f"Błąd serwera: {e}")
        return jsonify({"error": "Błąd serwera"}), 500