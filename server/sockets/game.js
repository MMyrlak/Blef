const db = require('../db/connection');
const activeGames = new Map();

function timestamp() {
  const now = new Date();
  const d = n => String(n).padStart(2, '0');
  return `${d(now.getDate())}/${d(now.getMonth()+1)} ${d(now.getHours())}:${d(now.getMinutes())}:${d(now.getSeconds())}`;
}

module.exports = (io) => {
    io.on('connection', (socket) => {

        socket.on('joinLobby', ({lobbyId, nickname}) => {
            socket.join(lobbyId);
            if(!activeGames.has(lobbyId)) {
                activeGames.set(lobbyId, { 
                    players: [],
                    answer: [],
                    votes: [],
                    impostorId: null,
                    usedQuestionPair: [], 
                    isHost: false,
                    round: 0,
                    stage: 'lobby',
                });
            }

            const game = activeGames.get(lobbyId);

            const rejoining = game.players.find(p => p.nickname === nickname && !p.connected);
            if (rejoining) {
            rejoining.id = socket.id;
            rejoining.connected = true;
            rejoining.disconnectedAt = null;
            socket.join(lobbyId);
            socket.emit('playerInfo', { ...rejoining, lobbyId });
            io.to(lobbyId).emit('playerUpdate', game.players);
            return;
            }

            const isHost = game.players.length === 0;
            let player = game.players.find(p => p.id === socket.id);
            if (!player) {
            const usedCardIds = new Set(game.players.map(p => p.playerCardId).filter(id => id !== undefined));

            let playerCardId;
            do {
                playerCardId = Math.floor(Math.random() * 32) + 1; // losuj z 1–32
            } while (usedCardIds.has(playerCardId));

            player = {
                id: socket.id,
                nickname,
                connected: true,
                isHost,
                score: 0,
                playerCardId
            };
            game.players.push(player);
            }
            socket.emit('playerInfo', {
            lobbyId: lobbyId,
            playerId: player.id,
            nickname: player.nickname,
            isHost: player.isHost,
            playerCardId: player.playerCardId
            });

            const activePlayers = game.players.filter(p => p.id !== null);
           
            io.to(lobbyId).emit('playerUpdate', activePlayers);
            io.to(lobbyId).emit('stageUpdate', game.stage);
        });

        socket.on('disconnect', () => {
            for (let [lobbyId, game] of activeGames) {
                const disconnectedPlayer = game.players.find(p => p.id === socket.id);
                if (disconnectedPlayer) {
                    disconnectedPlayer.connected = false;
                    disconnectedPlayer.disconnectedAt = Date.now();
                    disconnectedPlayer.id = null;
                    const activePlayers = game.players.filter(p => p.id !== null);
                    io.to(lobbyId).emit('playerUpdate', activePlayers);
                }
            }
        });

        socket.on('startRound', async ({lobbyId}) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            //reset rundy
            game.answer = [];
            game.votes = [];
            
            // losowanie oszusta
            const randomIndex = Math.floor(Math.random() * game.players.length);
            const impostor = game.players[randomIndex];
            game.impostorId = impostor.id;

            //losowanie nie używanej pary pytań 
            let pairId;
            let row;

            do {
                [row] = await db.query('SELECT pair_id FROM question_pairs ORDER BY RAND() LIMIT 1');
                pairId = row[0]?.pair_id;
            } while (game.usedQuestionPair.includes(pairId));

            game.usedQuestionPair.push(pairId);
            // pobranie pytania
            const [questions] = await db.query('SELECT * FROM question_pairs WHERE pair_id = ?', [pairId]);
            const questionForAll = questions.find(q=> q.for_impostor === 0);
            const questionForImpostor = questions.find(q=> q.for_impostor === 1);
            //wyślij pytanie
            for(const player of game.players) {
                const question = player.id === game.impostorId ? questionForImpostor.question : questionForAll.question;
                io.to(player.id).emit('giveQuestion', {
                    question
                });
            };
            io.to(lobbyId).emit('giveQuestions', {
                questionForAll: questionForAll.question,
                questionForImpostor: questionForImpostor.question
            });
            game.stage = 'question';
            io.to(lobbyId).emit('stageUpdate', game.stage);
        })

        socket.on('sendAnswer', ({ lobbyId, playerAnswer }) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;
            const player = game.players.find(p => p.id === socket.id);
            if (!player) return;

            const existingAnswerIndex = game.answer.findIndex(a => a.playerId === socket.id);

            if (existingAnswerIndex !== -1) {
                game.answer[existingAnswerIndex].playerAnswer = playerAnswer;
            } else {
                game.answer.push({
                    playerId: socket.id,
                    nickname: player.nickname,
                    playerAnswer
                });
            }
            
            const activePlayers = game.players.filter(p => p.id !== null);
            if (game.answer.length === activePlayers.length) {
                game.stage = 'vote';
                io.to(lobbyId).emit('startVoting', {
                    answers: game.answer
                });
                io.to(lobbyId).emit('stageUpdate', game.stage);
            }
        });

        socket.on('sendVote', ({lobbyId, votedId}) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            const existingVoteIndex = game.votes.findIndex(v => v.voterId === socket.id);
            if (existingVoteIndex !== -1) {
                    // Zaktualizuj istniejący głos
                    game.votes[existingVoteIndex].votedId = votedId;
                } else {
                    // Dodaj nowy głos
                    game.votes.push({
                        voterId: socket.id,
                        votedId
                    });
                }
            const activePlayers = game.players.filter(p => p.id !== null);
            if( game.votes.length === activePlayers.length){
                const impostor = game.impostorId;
                let impostor_points = 0;
                // Punkty:
                for (let player of game.players) {
                    if (player.id === impostor) continue;
                    const foundCorrectVote = game.votes.some(v => 
                        v.voterId === player.id && v.votedId === impostor
                    );
                    if (foundCorrectVote) {
                        player.score += 1; // Punkt za poprawne odgadnięcie
                    } else {
                        impostor_points++;
                    }
                }
                const impostorPlayer = game.players.find(p => p.id === impostor);
                if (impostorPlayer) { impostorPlayer.score += impostor_points}

                const votesWithNicknames = game.votes.map(vote => {
                    const votedPlayer = game.players.find(p => p.id === vote.votedId);
                    return {
                        voterId: vote.voterId,
                        votedId: vote.votedId,
                        votedNickname: votedPlayer ? votedPlayer.nickname : "Unknown Player"
                    };
                });


                game.stage = 'result';
                io.to(lobbyId).emit('stageUpdate', game.stage);
                io.to(lobbyId).emit('roundResult', {
                    votes: votesWithNicknames,
                    impostor: impostor,
                    scores: game.players.map(p => ({
                        id: p.id,
                        nickname: p.nickname,
                        score: p.score,
                        playerCardId: p.playerCardId
                    }))
                })
            };
        });

        socket.on('nextRoundReady', async ({ lobbyId }) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            game.readyNext = game.readyNext || new Set();
                if (game.readyNext.has(socket.id)) {
                // Jeśli jest, usuń go (cofnij gotowość)
                game.readyNext.delete(socket.id);
            } else {
                // Jeśli nie ma, dodaj go (zgłoś gotowość)
                game.readyNext.add(socket.id);
            }

            const activePlayers = game.players.filter(p => p.id !== null);
            if (game.readyNext.size === activePlayers.length) {
                delete game.readyNext;
                io.to(lobbyId).emit('clearLocalStorage');
                game.stage = 'lobby';
                io.to(lobbyId).emit('playerUpdate', activePlayers);
                io.to(lobbyId).emit('stageUpdate', game.stage);
            }
        });
    })
}