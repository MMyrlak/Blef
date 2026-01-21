import random
from flask import request
from flask_socketio import emit, join_room
from db import get_db_connection

# Globalny stan gier
active_games = {}

def register_game_sockets(socketio):
    
    @socketio.on('joinLobby')
    def handle_join_lobby(data):
        lobby_id = data.get('lobbyId')
        nickname = data.get('nickname')
        sid = request.sid

        join_room(lobby_id)
        
        if lobby_id not in active_games:
            active_games[lobby_id] = {
                'players': [],
                'answer': [],
                'votes': [],
                'impostorNickname': None,
                'usedQuestionPair': [],
                'stage': 'lobby',
                'currentQuestion': None,
                'currentQuestionForAll': None,
                'roundResult': None
            }

        game = active_games[lobby_id]

        # Logika Rejoining
        rejoining = next((p for p in game['players'] if p['nickname'] == nickname and not p['connected']), None)
        if rejoining:
            rejoining.update({'id': sid, 'connected': True})
        else:
            # Nowy gracz
            is_host = len(game['players']) == 0
            used_cards = {p['playerCardId'] for p in game['players'] if 'playerCardId' in p}
            card_id = random.randint(1, 32)
            while card_id in used_cards: card_id = random.randint(1, 32)

            player = {
                'id': sid, 'nickname': nickname, 'connected': True,
                'isHost': is_host, 'score': 0, 'playerCardId': card_id
            }
            game['players'].append(player)
            rejoining = player

        emit('playerInfo', {**rejoining, 'lobbyId': lobby_id})
        emit('playerUpdate', [p for p in game['players'] if p['id'] is not None], to=lobby_id)

    @socketio.on('getGameState')
    def handle_get_game_state(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return

        # Wysyłamy kompletny stan do gracza (naprawa problemu odświeżania na Firefox)
        emit('gameStateRecovered', {
            'stage': game['stage'],
            'question': game.get('currentQuestion'),
            'questionForAll': game.get('currentQuestionForAll'),
            'answers': game['answer'], # Przesyłamy listę odpowiedzi dla etapu głosowania
            'roundResult': game.get('roundResult'),
            'answeredCount': len(game['answer']),
            'votedCount': len(game['votes'])
        })

    @socketio.on('startRound')
    def handle_start_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return

        game.update({'answer': [], 'votes': [], 'roundResult': None})
        
        impostor = random.choice(game['players'])
        game['impostorNickname'] = impostor['nickname']

        conn = get_db_connection()
        # Wykluczanie użytych pytań
        placeholders = ','.join(['?'] * len(game['usedQuestionPair']))
        query = f"SELECT pair_id FROM question_pairs"
        if game['usedQuestionPair']: query += f" WHERE pair_id NOT IN ({placeholders})"
        query += " ORDER BY RANDOM() LIMIT 1"
        
        row = conn.execute(query, game['usedQuestionPair']).fetchone()
        if not row:
            game['usedQuestionPair'] = []
            row = conn.execute("SELECT pair_id FROM question_pairs ORDER BY RANDOM() LIMIT 1").fetchone()

        pair_id = row['pair_id']
        game['usedQuestionPair'].append(pair_id)
        
        questions = conn.execute("SELECT * FROM question_pairs WHERE pair_id = ?", (pair_id,)).fetchall()
        conn.close()

        q_all = next(q['question'] for q in questions if q['for_impostor'] == 0)
        q_imp = next(q['question'] for q in questions if q['for_impostor'] == 1)
        
        game['currentQuestionForAll'] = q_all
        game['stage'] = 'question'

        for player in game['players']:
            q_text = q_imp if player['nickname'] == game['impostorNickname'] else q_all
            # Każdy gracz dostaje swoje pytanie, ale serwer je pamięta
            emit('giveQuestion', {'question': q_text}, to=player['id'])

        emit('giveQuestions', {'questionForAll': q_all}, to=lobby_id)
        emit('stageUpdate', 'question', to=lobby_id)
        emit('playerActionUpdate', {'answeredCount': 0, 'votedCount': 0}, to=lobby_id)

    @socketio.on('sendAnswer')
    def handle_send_answer(data):
        lobby_id = data.get('lobbyId')
        ans_text = data.get('playerAnswer')
        game = active_games.get(lobby_id)
        if not game: return

        player = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not player: return

        # Zmiana odpowiedzi: jeśli już istnieje, nadpisz
        existing = next((a for a in game['answer'] if a['nickname'] == player['nickname']), None)
        if existing:
            existing['playerAnswer'] = ans_text
        else:
            game['answer'].append({'playerId': request.sid, 'nickname': player['nickname'], 'playerAnswer': ans_text})

        # Powiadom wszystkich o nowej liczbie zatwierdzonych odpowiedzi
        active_count = len([p for p in game['players'] if p['id'] is not None])
        emit('playerActionUpdate', {'answeredCount': len(game['answer'])}, to=lobby_id)

        if len(game['answer']) == active_count:
            game['stage'] = 'vote'
            emit('startVoting', {'answers': game['answer']}, to=lobby_id)
            emit('stageUpdate', 'vote', to=lobby_id)

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