import random
from flask import request
from flask_socketio import emit, join_room
from db import get_db_connection

# Odpowiednik: const activeGames = new Map();
active_games = {}

def register_game_sockets(socketio):
    
    @socketio.on('joinLobby')
    def handle_join_lobby(data):
        lobby_id = data.get('lobbyId')
        nickname = data.get('nickname')
        sid = request.sid

        join_room(lobby_id)
        
        # Inicjalizacja gry, jeśli nie istnieje 
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

        # Logika rejoining (powrót po odświeżeniu strony) 
        rejoining = next((p for p in game['players'] if p['nickname'] == nickname and not p['connected']), None)
        if rejoining:
            rejoining['id'] = sid
            rejoining['connected'] = True
            emit('playerInfo', {**rejoining, 'lobbyId': lobby_id})
            active_players = [p for p in game['players'] if p['id'] is not None]
            emit('playerUpdate', active_players, to=lobby_id)
            return

        # Sprawdzenie czy gracz jest hostem i losowanie karty 
        is_host = len(game['players']) == 0
        used_card_ids = {p['playerCardId'] for p in game['players'] if 'playerCardId' in p}
        
        player_card_id = random.randint(1, 32)
        while player_card_id in used_card_ids:
            player_card_id = random.randint(1, 32)

        player = {
            'id': sid,
            'nickname': nickname,
            'connected': True,
            'isHost': is_host,
            'score': 0,
            'playerCardId': player_card_id
        }
        game['players'].append(player)
        
        emit('playerInfo', {
            'lobbyId': lobby_id,
            'playerId': sid,
            'nickname': nickname,
            'isHost': is_host,
            'playerCardId': player_card_id
        })

        active_players = [p for p in game['players'] if p['id'] is not None]
        emit('playerUpdate', active_players, to=lobby_id)
        emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        for lobby_id, game in active_games.items():
            player = next((p for p in game['players'] if p['id'] == sid), None)
            if player:
                player['connected'] = False
                player['id'] = None
                active_players = [p for p in game['players'] if p['id'] is not None]
                emit('playerUpdate', active_players, to=lobby_id)

    @socketio.on('startRound')
    def handle_start_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game:
            return

        game['answer'] = []
        game['votes'] = []
        
        # Losowanie impostora 
        impostor = random.choice(game['players'])
        game['impostorNickname'] = impostor['nickname']

        conn = get_db_connection()
        # Losowanie pair_id z wykluczeniem użytych 
        placeholders = ','.join(['?'] * len(game['usedQuestionPair']))
        query = "SELECT pair_id FROM question_pairs"
        if game['usedQuestionPair']:
            query += f" WHERE pair_id NOT IN ({placeholders})"
        query += " ORDER BY RANDOM() LIMIT 1"
        
        row = conn.execute(query, game['usedQuestionPair']).fetchone()
        
        if not row: # Reset, jeśli pula pytań się wyczerpie
            game['usedQuestionPair'] = []
            row = conn.execute("SELECT pair_id FROM question_pairs ORDER BY RANDOM() LIMIT 1").fetchone()

        pair_id = row['pair_id']
        game['usedQuestionPair'].append(pair_id)
        
        questions = conn.execute("SELECT * FROM question_pairs WHERE pair_id = ?", (pair_id,)).fetchall()
        conn.close()

        q_all = next(q['question'] for q in questions if q['for_impostor'] == 0)
        q_imp = next(q['question'] for q in questions if q['for_impostor'] == 1)
        
        for player in game['players']:
            question = q_imp if player['nickname'] == game['impostorNickname'] else q_all
            emit('giveQuestion', {'question': question}, to=player['id'])

        emit('giveQuestions', {
            'questionForAll': q_all,
            'questionForImpostor': q_imp
        }, to=lobby_id)
        
        game['stage'] = 'question'
        emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('sendAnswer')
    def handle_send_answer(data):
        lobby_id = data.get('lobbyId')
        player_answer = data.get('playerAnswer')
        game = active_games.get(lobby_id)
        if not game: return

        player = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not player: return

        # Aktualizacja lub dodanie nowej odpowiedzi 
        existing = next((a for a in game['answer'] if a['nickname'] == player['nickname']), None)
        if existing:
            existing['playerAnswer'] = player_answer
            existing['playerId'] = request.sid
        else:
            game['answer'].append({
                'playerId': request.sid,
                'nickname': player['nickname'],
                'playerAnswer': player_answer
            })
        
        active_players = [p for p in game['players'] if p['id'] is not None]
        if len(game['answer']) == len(active_players):
            game['stage'] = 'vote'
            emit('startVoting', {'answers': game['answer']}, to=lobby_id)
            emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('sendVote')
    def handle_send_vote(data):
        lobby_id = data.get('lobbyId')
        voted_nickname = data.get('votedNickname')
        game = active_games.get(lobby_id)
        if not game: return

        voter = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not voter: return

        existing_vote = next((v for v in game['votes'] if v['voterNickname'] == voter['nickname']), None)
        if existing_vote:
            existing_vote['votedNickname'] = voted_nickname
        else:
            game['votes'].append({
                'voterNickname': voter['nickname'],
                'votedNickname': voted_nickname
            })

        active_players = [p for p in game['players'] if p['id'] is not None]
        if len(game['votes']) == len(active_players):
            impostor_nickname = game['impostorNickname']
            impostor_points = 0
            
            # Punktacja: +1 dla gracza za wykrycie impostora, impostor dostaje punkty za każdego kto się pomylił 
            for player in game['players']:
                if player['nickname'] == impostor_nickname:
                    continue
                
                correct = any(v for v in game['votes'] if v['voterNickname'] == player['nickname'] and v['votedNickname'] == impostor_nickname)
                if correct:
                    player['score'] += 1
                else:
                    impostor_points += 1
            
            impostor_player = next(p for p in game['players'] if p['nickname'] == impostor_nickname)
            if impostor_player:
                impostor_player['score'] += impostor_points

            game['stage'] = 'result'
            emit('stageUpdate', game['stage'], to=lobby_id)
            emit('roundResult', {
                'votes': game['votes'],
                'impostor': impostor_nickname,
                'scores': [{
                    'nickname': p['nickname'],
                    'score': p['score'],
                    'playerCardId': p['playerCardId']
                } for p in game['players']]
            }, to=lobby_id)

    @socketio.on('nextRoundReady')
    def handle_next_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return

        if 'readyNext' not in game:
            game['readyNext'] = set()
            
        if request.sid in game['readyNext']:
            game['readyNext'].remove(request.sid)
        else:
            game['readyNext'].add(request.sid)

        active_players = [p for p in game['players'] if p['id'] is not None]
        if len(game['readyNext']) == len(active_players):
            del game['readyNext']
            emit('clearLocalStorage', to=lobby_id)
            game['stage'] = 'lobby'
            emit('playerUpdate', active_players, to=lobby_id)
            emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('getGameState')
    def handle_get_game_state(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return
        
        # Zwracamy wszystko, co potrzebne do odtworzenia widoku
        emit('gameStateRecovered', {
            'stage': game['stage'],
            'impostorNickname': game.get('impostorNickname'),
            'answers': game.get('answer', []),
            'votes': game.get('votes', []),
            'roundResult': game.get('roundResult'), # przechowuj ostatni wynik
            'answeredCount': len(game.get('answer', [])),
            'votedCount': len(game.get('votes', []))
        })

    @socketio.on('cancelRound')
    def handle_cancel_round(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return
        
        # Tylko host może anulować (opcjonalnie)
        game['stage'] = 'lobby'
        game['answer'] = []
        game['votes'] = []
        emit('stageUpdate', 'lobby', to=lobby_id)
        emit('roundCancelled', to=lobby_id)