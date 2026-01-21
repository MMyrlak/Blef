import sqlite3

def get_db_connection():
    # SQLite tworzy plik bazy automatycznie, jeśli nie istnieje
    conn = sqlite3.connect('blef.db')
    conn.row_factory = sqlite3.Row  # Pozwala na dostęp do kolumn po nazwach (jak w JS)
    return conn

def init_db():
    conn = get_db_connection()
    # Inicjalizacja tabel (zgodnie z logiką Twoich zapytań SQL)
    conn.execute('CREATE TABLE IF NOT EXISTS lobbies (id TEXT PRIMARY KEY, isOpen INTEGER)')
    conn.execute('''CREATE TABLE IF NOT EXISTS question_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair_id INTEGER,
        question TEXT,
        for_impostor INTEGER
    )''')
    conn.commit()
    conn.close()