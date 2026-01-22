import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'blef.db')

def get_db_connection():
    """Tworzy połączenie z bazą danych i ustawia row_factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

def init_db():
    """Inicjalizuje tabele w bazie danych SQLite."""
    conn = get_db_connection()
    
    conn.execute('''
        CREATE TABLE IF NOT EXISTS lobbies (
            id TEXT PRIMARY KEY,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            isOpen INTEGER DEFAULT 1
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS question_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            for_impostor INTEGER NOT NULL
        )
    ''')
    conn.execute("DELETE FROM lobbies")

    conn.commit()
    conn.close()
    print("Baza danych SQLite została zainicjalizowana pomyślnie.")

if __name__ == "__main__":
    init_db()