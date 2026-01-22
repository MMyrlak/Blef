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

        join_room(lobby_id)
        
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

        existing_player = next((p for p in game['players'] if p['nickname'] == nickname), None)

        if existing_player:
            existing_player['id'] = sid
            existing_player['connected'] = True
            emit('playerInfo', {**existing_player, 'lobbyId': lobby_id})
            print(f"Gracz {nickname} powrócił do lobby {lobby_id}")
        else:
            is_host = len(game['players']) == 0
            
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
            emit('playerInfo', {**new_player, 'lobbyId': lobby_id})
            print(f"Nowy gracz {nickname} dołączył do lobby {lobby_id} (Host: {is_host})")

        active_list = [p for p in game['players'] if p['connected']]
        emit('playerUpdate', active_list, to=lobby_id)
        
        emit('stageUpdate', game['stage'], to=lobby_id)

    @socketio.on('getGameState')
    def handle_get_game_state(data):
        lobby_id = data.get('lobbyId')
        game = active_games.get(lobby_id)
        if not game: return

        me = next((p for p in game['players'] if p['id'] == request.sid), None)
        
        my_question = None
        if game['stage'] == 'question' and me:
            q_text = game.get('currentQuestionForImpostor') if me['nickname'] == game.get('impostorNickname') else game.get('currentQuestionForAll')
            my_question = {'question': q_text}

        emit('gameStateRecovered', {
            'stage': game['stage'],
            'question': my_question,
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

        game.update({
            'answer': [],
            'votes': [],
            'roundResult': None,
            'stage': 'question',
            'readyNext': set() 
        })

        active_players = [p for p in game['players'] if p['connected'] and p['id'] is not None]
        if len(active_players) < 2:
            emit('error', {'message': 'Potrzeba co najmniej 2 graczy, aby zacząć!'}, to=request.sid)
            return

        potential_impostors = [p for p in active_players if p['nickname'] != game.get('lastImpostor')]
        if not potential_impostors:
            potential_impostors = active_players

        impostor = random.choice(potential_impostors)
        game['impostorNickname'] = impostor['nickname']
        game['lastImpostor'] = impostor['nickname']  

        conn = get_db_connection()
        used_ids = game.get('usedQuestionPair', [])
        
        placeholders = ','.join(['?'] * len(used_ids))
        query = "SELECT pair_id FROM question_pairs"
        if used_ids:
            query += f" WHERE pair_id NOT IN ({placeholders})"
        query += " ORDER BY RANDOM() LIMIT 1"
        
        row = conn.execute(query, used_ids).fetchone()

        if not row:
            game['usedQuestionPair'] = []
            row = conn.execute("SELECT pair_id FROM question_pairs ORDER BY RANDOM() LIMIT 1").fetchone()

        if row is None:
            conn.close()
            print("BŁĄD: Tabela question_pairs jest pusta!")
            emit('error', {'message': 'Błąd serwera: brak pytań w bazie.'}, to=request.sid)
            return

        pair_id = row['pair_id']
        game.setdefault('usedQuestionPair', []).append(pair_id)
        
        questions = conn.execute(
            "SELECT question, for_impostor FROM question_pairs WHERE pair_id = ?", 
            (pair_id,)
        ).fetchall()
        conn.close()

        try:
            q_all = next(q['question'] for q in questions if q['for_impostor'] == 0)
            q_imp = next(q['question'] for q in questions if q['for_impostor'] == 1)
        except StopIteration:
            print(f"BŁĄD: Niekompletna para pytań dla pair_id: {pair_id}")
            return

        game['currentQuestionForAll'] = q_all
        game['currentQuestionForImpostor'] = q_imp

        for player in game['players']:
            if not player['connected'] or player['id'] is None:
                continue
                
            q_to_send = q_imp if player['nickname'] == game['impostorNickname'] else q_all
            emit('giveQuestion', {'question': q_to_send}, to=player['id'])

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

        existing_answer = next((a for a in game['answer'] if a['nickname'] == player['nickname']), None)
        if existing_answer:
            existing_answer['playerAnswer'] = answer_text
        else:
            game['answer'].append({
                'nickname': player['nickname'],
                'playerAnswer': answer_text,
                'playerCardId': player['playerCardId'] 
            })

        emit('playerActionUpdate', {
            'answeredCount': len(game['answer']),
            'votedCount': len(game['votes'])
        }, to=lobby_id)

        check_and_advance_stage(lobby_id)

    @socketio.on('sendVote')
    def handle_send_vote(data):
        lobby_id = data.get('lobbyId')
        voted_nick = data.get('votedNickname')
        game = active_games.get(lobby_id)
        if not game: return

        voter = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not voter: return

        existing = next((v for v in game['votes'] if v['voterNickname'] == voter['nickname']), None)
        if existing:
            existing['votedNickname'] = voted_nick
        else:
            game['votes'].append({'voterNickname': voter['nickname'], 'votedNickname': voted_nick})

        emit('playerActionUpdate', {'votedCount': len(game['votes'])}, to=lobby_id)

        active_players = [p for p in game['players'] if p['id'] is not None]
        if len(game['votes']) == len(active_players):
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

        player = next((p for p in game['players'] if p['id'] == request.sid), None)
        if not player:
            return

        if 'readyNext' not in game:
            game['readyNext'] = set()

        if player['nickname'] in game['readyNext']:
            game['readyNext'].remove(player['nickname'])
        else:
            game['readyNext'].add(player['nickname'])

        active_players = [p for p in game['players'] if p['id'] is not None]
        
        if len(game['readyNext']) >= len(active_players):
            game['readyNext'] = set()
            game['answer'] = []
            game['votes'] = []
            game['stage'] = 'lobby'
            
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

                check_and_advance_stage(lobby_id)
                
                emit('playerUpdate', [p for p in game['players'] if p['connected']], to=lobby_id)
                break

    def check_and_advance_stage(lobby_id):
        game = active_games.get(lobby_id)
        if not game: return

        active_players = [p for p in game['players'] if p['connected']]
        if not active_players: return

        if game['stage'] == 'question':
            answered_nicknames = {a['nickname'] for a in game['answer']}
            active_nicknames = {p['nickname'] for p in active_players}
            
            if active_nicknames.issubset(answered_nicknames):
                game['stage'] = 'vote'
                emit('startVoting', {'answers': game['answer']}, to=lobby_id)
                emit('stageUpdate', 'vote', to=lobby_id)

        elif game['stage'] == 'vote':
            voted_nicknames = {v['voterNickname'] for v in game['votes']}
            active_nicknames = {p['nickname'] for p in active_players}
            