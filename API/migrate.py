import sqlite3
import re
import os

def migrate():
    sql_file = 'blef.sql'
    db_file = 'blef.db'

    if not os.path.exists(sql_file):
        print(f"Błąd: Plik {sql_file} nie istnieje!")
        return

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    print("Przygotowywanie struktury bazy danych...")
    
    # 1. Tabela question_pairs
    cursor.execute('DROP TABLE IF EXISTS question_pairs')
    cursor.execute('''
        CREATE TABLE question_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            for_impostor INTEGER NOT NULL
        )
    ''')

    # 2. Tabela lobbies
    cursor.execute('DROP TABLE IF EXISTS lobbies')
    cursor.execute('''
        CREATE TABLE lobbies (
            id TEXT PRIMARY KEY,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            isOpen INTEGER DEFAULT 1
        )
    ''')

    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
        # --- MIGRACJA QUESTION_PAIRS ---
        print("Przetwarzanie pytań...")
        q_pattern = re.compile(
            r"INSERT INTO `question_pairs` \(`id`, `pair_id`, `question`, `for_impostor`\) VALUES\s*(.*?);", 
            re.DOTALL
        )
        q_match = q_pattern.search(content)
        if q_match:
            q_records = re.findall(r"\((\d+),\s*(\d+),\s*'(.*?)',\s*(\d+)\)", q_match.group(1))
            for rec in q_records:
                q_id, pair_id, question, for_impostor = rec
                cursor.execute(
                    "INSERT INTO question_pairs (id, pair_id, question, for_impostor) VALUES (?, ?, ?, ?)",
                    (q_id, pair_id, question.replace("''", "'"), for_impostor)
                )
            print(f"Pomyślnie przeniesiono {len(q_records)} pytań.")

        # --- MIGRACJA LOBBIES ---
        print("Przetwarzanie lobby...")
        l_pattern = re.compile(
            r"INSERT INTO `lobbies` \(`id`, `created_at`, `isOpen`\) VALUES\s*(.*?);", 
            re.DOTALL
        )
        l_match = l_pattern.search(content)
        if l_match:
            # POPRAWKA: Ucieczka myślnika w klasie znaków dla daty: [\d\- :]+
            l_records = re.findall(r"\('([a-f0-9\-]+)',\s*'([\d\- :]+)',\s*(\d+)\)", l_match.group(1))
            for rec in l_records:
                l_id, l_date, l_open = rec
                cursor.execute(
                    "INSERT INTO lobbies (id, created_at, isOpen) VALUES (?, ?, ?)",
                    (l_id, l_date, l_open)
                )
            print(f"Pomyślnie przeniesiono {len(l_records)} rekordów lobby.")

    conn.commit()
    conn.close()
    print("\nMigracja zakończona sukcesem!")

if __name__ == "__main__":
    migrate()