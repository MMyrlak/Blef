import random
from flask import request
from flask_socketio import emit, join_room
from db import get_db_connection

active_games = {}

def register_game_sockets(socketio):
    
    @socketio.on('joinLobby')
    def handle_join_lobby(data):
        lobby_id = data.get('lobbyId')
        nickname = str(data.get('nickname', '')).strip()
        sid = request.sid

        if not lobby_id or not nickname:
            return

        # Gracz dołącza do pokoju Socket.io dla danego lobby
        join_room(lobby_id)
        
        # Inicjalizacja gry, jeśli lobby jeszcze nie istnieje w pamięci serwera
        if lobby_id not in active_games:
            active_games[lobby_id] = {
                'players': [],
                'answer': [],
                'votes': [],
                'impostorNickname': None,
                'usedQuestionPair': [],
                'stage': 'lobby'
            }

        game = active_games[lobby_id]

        # --- LOGIKA UNIKANIA DUPLIKATÓW (State Recovery) ---
        # Szukamy, czy gracz o takim nicku już istnieje w tym lobby
        existing_player = next((p for p in game['players'] if p['nickname'] == nickname), None)

        if existing_player:
            # Jeśli gracz wrócił (np. po odświeżeniu), podpinamy jego nowe połączenie (sid)
            existing_player['id'] = sid
            existing_player['connected'] = True
            # Wysyłamy mu jego dane (zachowując punkty, kartę i status hosta)
            emit('playerInfo', {**existing_player, 'lobbyId': lobby_id})
            print(f"Gracz {nickname} powrócił do lobby {lobby_id}")
        else:
            # Jeśli to zupełnie nowy gracz, sprawdzamy czy powinien być hostem
            # Hostem zostaje pierwsza osoba w tablicy players
            is_host = len(game['players']) == 0
            
            # Losowanie ID karty (unikamy duplikatów kart w jednym lobby)
            used_cards = {p['playerCardId'] for p in game['players']}
            card_id = random.randint(1, 32)
            while card_id in used_cards and len(used_cards) < 32:
                card_id = random.randint(1, 32)

            new_player = {
                'id': sid,
                'nickname': nickname,
                'connected': True,
                'isHost': is_host,
                'score': 0,
                'playerCardId': card_id
            }
            game['players'].append(new_player)
            # Wysyłamy nowemu graczowi jego unikalne informacje
            emit('playerInfo', {**new_player, 'lobbyId': lobby_id})
            print(f"Nowy gracz {nickname} dołączył do lobby {lobby_id} (Host: {is_host})")

        # Aktualizujemy listę graczy u wszystkich w pokoju
        # Wysyłamy tylko graczy, którzy mają aktualnie przypisany aktywny socket ID
        active_list = [p for p in game['players'] if p['connected']]
        emit('playerUpdate', active_list, to=lobby_id)
        
        # Informujemy o aktualnym etapie gry (przydatne przy odświeżeniu w trakcie rundy)
        emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('getGameState')
    def handle_get_game_state(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return

        # Znajdujemy gracza, który wysłał zapytanie
        me = next((p for p in game['players'] if p['id'] == request.sid), None)
        
        # Ustalamy, które pytanie powinien widzieć ten konkretny gracz
        my_question = None
        if game['stage'] == 'question' and me:
            q_text = game.get('currentQuestionForImpostor') if me['nickname'] == game.get('impostorNickname') else game.get('currentQuestionForAll')
            my_question = {'question': q_text}

        emit('gameStateRecovered', {
            'stage': game['stage'],
            'question': my_question, # Wysyłamy właściwe pytanie
            'questionForAll': game.get('currentQuestionForAll'),
            'answers': game['answer'],
            'roundResult': game.get('roundResult'),
            'answeredCount': len(game['answer']),
            'votedCount': len(game['votes'])
        })


    @socketio.on('startRound')
    def handle_start_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game:
            return

        # 1. Resetowanie danych rundy
        game.update({
            'answer': [],
            'votes': [],
            'roundResult': None,
            'stage': 'question',
            'readyNext': set()  # Resetowanie gotowości na kolejną rundę
        })

        # 2. Wybór Impostora (z filtrowaniem aktywnych i unikaniem powtórek)
        active_players = [p for p in game['players'] if p['connected'] and p['id'] is not None]
        if len(active_players) < 2:
            emit('error', {'message': 'Potrzeba co najmniej 2 graczy, aby zacząć!'}, to=request.sid)
            return

        # Unikanie tego samego impostora dwa razy pod rząd
        potential_impostors = [p for p in active_players if p['nickname'] != game.get('lastImpostor')]
        if not potential_impostors:
            potential_impostors = active_players

        impostor = random.choice(potential_impostors)
        game['impostorNickname'] = impostor['nickname']
        game['lastImpostor'] = impostor['nickname']  # Zapamiętujemy na potrzeby kolejnej rundy

        # 3. Losowanie pytania z bazy SQLite
        conn = get_db_connection()
        used_ids = game.get('usedQuestionPair', [])
        
        # Budowanie zapytania wykluczającego już użyte pary pytań
        placeholders = ','.join(['?'] * len(used_ids))
        query = "SELECT pair_id FROM question_pairs"
        if used_ids:
            query += f" WHERE pair_id NOT IN ({placeholders})"
        query += " ORDER BY RANDOM() LIMIT 1"
        
        row = conn.execute(query, used_ids).fetchone()

        # Jeśli pula pytań się wyczerpała, resetujemy historię i losujemy od nowa
        if not row:
            game['usedQuestionPair'] = []
            row = conn.execute("SELECT pair_id FROM question_pairs ORDER BY RANDOM() LIMIT 1").fetchone()

        # Zabezpieczenie przed pustą bazą danych
        if row is None:
            conn.close()
            print("BŁĄD: Tabela question_pairs jest pusta!")
            emit('error', {'message': 'Błąd serwera: brak pytań w bazie.'}, to=request.sid)
            return

        pair_id = row['pair_id']
        game.setdefault('usedQuestionPair', []).append(pair_id)
        
        # Pobranie obu pytań (dla graczy i dla impostora)
        questions = conn.execute(
            "SELECT question, for_impostor FROM question_pairs WHERE pair_id = ?", 
            (pair_id,)
        ).fetchall()
        conn.close()

        try:
            # q['question'] zadziała, jeśli w db.py masz ustawione conn.row_factory = sqlite3.Row
            q_all = next(q['question'] for q in questions if q['for_impostor'] == 0)
            q_imp = next(q['question'] for q in questions if q['for_impostor'] == 1)
        except StopIteration:
            print(f"BŁĄD: Niekompletna para pytań dla pair_id: {pair_id}")
            return

        # Zapisujemy pytania w stanie gry (wymagane do gameStateRecovered po odświeżeniu)
        game['currentQuestionForAll'] = q_all
        game['currentQuestionForImpostor'] = q_imp

        # 4. Wysyłka pytań do graczy
        for player in game['players']:
            if not player['connected'] or player['id'] is None:
                continue
                
            # Każdy gracz otrzymuje swoją wersję pytania
            q_to_send = q_imp if player['nickname'] == game['impostorNickname'] else q_all
            emit('giveQuestion', {'question': q_to_send}, to=player['id'])

        # 5. Aktualizacja etapu u wszystkich
        emit('giveQuestions', {'questionForAll': q_all}, to=lobby_id)
        emit('stageUpdate', 'question', to=lobby_id)
        emit('playerActionUpdate', {'answeredCount': 0, 'votedCount': 0}, to=lobby_id)

    @socketio.on('sendAnswer')
    def handle_send_answer(data):
        lobby_id = data.get('lobbyId')
        answer_text = data.get('playerAnswer')
        game = active_games.get(lobby_id)
        if not game: return

        player = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not player: return

        # Zapisujemy odpowiedź (lub aktualizujemy istniejącą)
        existing_answer = next((a for a in game['answer'] if a['nickname'] == player['nickname']), None)
        if existing_answer:
            existing_answer['playerAnswer'] = answer_text
        else:
            game['answer'].append({
                'nickname': player['nickname'],
                'playerAnswer': answer_text,
                'playerCardId': player['playerCardId'] # Potrzebne do wyświetlenia karty w głosowaniu
            })

        # Wysyłamy licznik do wszystkich
        emit('playerActionUpdate', {
            'answeredCount': len(game['answer']),
            'votedCount': len(game['votes'])
        }, to=lobby_id)

        # Sprawdzamy, czy to była ostatnia brakująca odpowiedź
        check_and_advance_stage(lobby_id)

    @socketio.on('sendVote')
    def handle_send_vote(data):
        lobby_id = data.get('lobbyId')
        voted_nick = data.get('votedNickname')
        game = active_games.get(lobby_id)
        if not game: return

        voter = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not voter: return

        # Rejestracja/zmiana głosu
        existing = next((v for v in game['votes'] if v['voterNickname'] == voter['nickname']), None)
        if existing:
            existing['votedNickname'] = voted_nick
        else:
            game['votes'].append({'voterNickname': voter['nickname'], 'votedNickname': voted_nick})

        emit('playerActionUpdate', {'votedCount': len(game['votes'])}, to=lobby_id)

        active_players = [p for p in game['players'] if p['id'] is not None]
        if len(game['votes']) == len(active_players):
            # Obliczanie punktów (logika dzielenia przez 2 może być po stronie frontu lub tu)
            # Tutaj zachowujemy Twoją oryginalną logikę punktacji
            imp_nick = game['impostorNickname']
            imp_pts = 0
            for p in game['players']:
                if p['nickname'] == imp_nick: continue
                correct = any(v for v in game['votes'] if v['voterNickname'] == p['nickname'] and v['votedNickname'] == imp_nick)
                if correct: p['score'] += 1
                else: imp_pts += 1
            
            impostor_p = next(p for p in game['players'] if p['nickname'] == imp_nick)
            impostor_p['score'] += imp_pts

            game['roundResult'] = {
                'votes': game['votes'],
                'impostor': imp_nick,
                'scores': [{'nickname': p['nickname'], 'score': p['score'], 'playerCardId': p['playerCardId']} for p in game['players']]
            }
            game['stage'] = 'result'
            emit('roundResult', game['roundResult'], to=lobby_id)
            emit('stageUpdate', 'result', to=lobby_id)

    @socketio.on('cancelRound')
    def handle_cancel_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if game:
            game['stage'] = 'lobby'
            game['answer'] = []
            game['votes'] = []
            emit('stageUpdate', 'lobby', to=lobby_id)
            emit('clearLocalStorage', to=lobby_id)

    @socketio.on('nextRoundReady')
    def handle_next_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game:
            return

        # Pobieramy gracza, który wysłał sygnał
        player = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not player:
            return

        # Inicjalizacja zbioru gotowych graczy (używamy nicków!)
        if 'readyNext' not in game:
            game['readyNext'] = set()

        # Logika przełączania (toggle) gotowości
        if player['nickname'] in game['readyNext']:
            game['readyNext'].remove(player['nickname'])
        else:
            game['readyNext'].add(player['nickname'])

        # Liczymy tylko aktywnych graczy (tych, którzy są aktualnie połączeni)
        active_players = [p for p in game['players'] if p['id'] is not None]
        
        # Jeśli liczba gotowych nicków pokrywa się z liczbą aktywnych graczy
        if len(game['readyNext']) >= len(active_players):
            # Czyścimy dane rundy
            game['readyNext'] = set()
            game['answer'] = []
            game['votes'] = []
            game['stage'] = 'lobby'
            
            # Powiadamiamy wszystkich o zmianie etapu i czyszczeniu local storage
            emit('clearLocalStorage', to=lobby_id)
            emit('stageUpdate', 'lobby', to=lobby_id)
            emit('playerUpdate', active_players, to=lobby_id)

    @socketio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        for lobby_id, game in active_games.items():
            player = next((p for p in game['players'] if p['id'] == sid), None)
            if player:
                player['connected'] = False
                player['id'] = None
                print(f"Gracz {player['nickname']} wyszedł, ale jego dane zostają.")

                # Sprawdzamy, czy po wyjściu gracza można przejść do kolejnego etapu
                check_and_advance_stage(lobby_id)
                
                # Informujemy pozostałych o zmianie statusu (np. karta gracza w lobby zszarzeje)
                emit('playerUpdate', [p for p in game['players'] if p['connected']], to=lobby_id)
                break

    def check_and_advance_stage(lobby_id):
        game = active_games.get(lobby_id)
        if not game: return

        # Pobieramy TYLKO aktywnych graczy (tych, którzy są połączeni)
        active_players = [p for p in game['players'] if p['connected']]
        if not active_players: return

        # Etap PYTAŃ -> GŁOSOWANIA
        if game['stage'] == 'question':
            # Liczymy ile osób z OBECNYCH dało już odpowiedź
            answered_nicknames = {a['nickname'] for a in game['answer']}
            active_nicknames = {p['nickname'] for p in active_players}
            
            # Jeśli każdy kto jest połączony, dał odpowiedź
            if active_nicknames.issubset(answered_nicknames):
                game['stage'] = 'vote'
                emit('startVoting', {'answers': game['answer']}, to=lobby_id)
                emit('stageUpdate', 'vote', to=lobby_id)

        # Etap GŁOSOWANIA -> WYNIKÓW
        elif game['stage'] == 'vote':
            voted_nicknames = {v['voterNickname'] for v in game['votes']}
            active_nicknames = {p['nickname'] for p in active_players}
            
            if active_nicknames.issubset(voted_nicknames):
                calculate_results(lobby_id) # Twoja funkcja licząca punkty