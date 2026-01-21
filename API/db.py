import sqlite3
import os

# Definicja ścieżki do pliku bazy danych
DB_PATH = os.path.join(os.path.dirname(__file__), 'blef.db')

def get_db_connection():
    """Tworzy połączenie z bazą danych i ustawia row_factory."""
    conn = sqlite3.connect(DB_PATH)
    # Kluczowe dla SQLite: pozwala na dostęp do kolumn po nazwach (np. row['pair_id'])
    conn.row_factory = sqlite3.Row 
    return conn

def init_db():
    """Inicjalizuje tabele w bazie danych SQLite."""
    conn = get_db_connection()
    
    # 1. Tabela lobbies - przechowuje identyfikatory pokoi
    # Używamy TEXT dla UUID oraz INTEGER dla flagi isOpen
    conn.execute('''
        CREATE TABLE IF NOT EXISTS lobbies (
            id TEXT PRIMARY KEY,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            isOpen INTEGER DEFAULT 1
        )
    ''')

    # 2. Tabela question_pairs - przechowuje pary pytań dla graczy i impostora
    # id jest kluczem głównym z autoinkrementacją
    conn.execute('''
        CREATE TABLE IF NOT EXISTS question_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            for_impostor INTEGER NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print("Baza danych SQLite została zainicjalizowana pomyślnie.")

if __name__ == "__main__":
    init_db()