const db = require('../db/connection');
const activeGames = new Map();

function timestamp() {
  const now = new Date();
  const d = n => String(n).padStart(2, '0');
  return `${d(now.getDate())}/${d(now.getMonth()+1)} ${d(now.getHours())}:${d(now.getMinutes())}:${d(now.getSeconds())}`;
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Połączono użytkownika o id: ${socket.id} o godzinie ${timestamp()}`);

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
            player = {
                id: socket.id,
                nickname,
                connected: true,
                isHost,
                score: 0
            };
            game.players.push(player);
            }
            socket.emit('playerInfo', {
            lobbyId: lobbyId,
            playerId: player.id,
            nickname: player.nickname,
            isHost: player.isHost
            });
            console.log("NewPlayer: ",player);
            console.log("Gracze: ",game.players);
            console.log("Socket.io id gracza: ",socket.id);
            const activePlayers = game.players.filter(p => p.id !== null);
            io.to(lobbyId).emit('playerUpdate', activePlayers);
        });

        socket.on('disconnect', () => {
            for (let [lobbyId, game] of activeGames) {
                const disconnectedPlayer = game.players.find(p => p.id === socket.id);
                if (disconnectedPlayer) {
                    disconnectedPlayer.connected = false;
                    disconnectedPlayer.disconnectedAt = Date.now();
                    disconnectedPlayer.id = null;
                    io.to(lobbyId).emit('playerUpdate', game.players);
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

            do {
                const [row] = await db.query('SELECT pair_id FROM question_pair ORDER BY RAND() LIMIT 1');
                pairId = row[0]?.id;
            } while (game.usedQuestionPair.includes(pairId))
            
            game.usedQuestionPair.push(pairId);
            console.log("Id pary pytań: ",pairId)
            // pobranie pytania
            const [questions] = await db.query('SELECT * FROM question_pair WHERE pair_id = ?', [pairId]);
            console.log("Pytania: ",questions);
            const questionForAll = questions.find(q=> q.for_impostor === 0);
            const questionForImpostor = questions.find(q=> q.for_impostor === 1);

            //wyślij pytanie
            for(const player of game.players) {
                const question = player.id === game.impostorId ? questionForImpostor.content : questionForAll.content;
                io.to(player.id).emit('question', {
                    question
                });
            };

            io.to(lobbyId).emit('roundStarted', {
                round: ++game.round,
                players: game.players,
                gameStage: 'question'
            })
        })

        socket.on('sendAnswer', ({lobbyId, playerAnswer}) => {
            const game = activeGames.get(lobbyId);
            if(!game) return;

            const player = game.players.find(p => p.id === socket.id);
            if (!player) return;

            game.answer.push({
                playerId: socket.id,
                nickname: player.nickname,
                playerAnswer
            });

            console.log("Odpowiedzi graczy: ", game.answer);
            const activePlayers = game.players.filter(p => p.id !== null);
            if(game.answer.length === activePlayers.length) {
                io.to(lobbyId).emit('startVoting', {
                    answers: game.answer,
                    gameStage: 'vote'
                    });
            }
        });

        socket.on('sendVote', ({lobbyId, votedId}) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            game.votes.push({
                voterId: socket.id,
                votedId
            });
            if( game.votes.length === game.players.length){
                const impostor = game.impostorId;
                const impostor_points = 0;
                // Punkty:
                for (let player of game.players) {
                    if (player.id !== impostor && game.votes.find(v => v.voterId === player.id && v.votedId === impostor)) {
                        player.score += 1; // Odkrycie impostora
                    } else if (player.id !== impostor) {
                        impostor_points++;
                    }
                }
                const impostorPlayer = game.players.find(p => p.id === impostor);
                if (impostorPlayer) { impostorPlayer.score += impostor_points}
                
                io.to(lobbyId).emit('roundResult', {
                    gameStage: 'result',
                    votes: game.votes,
                    impostor: impostor,
                    scores: game.player.map(p => ({
                        id: p.id,
                        nickname: p.nickname,
                        score: p.score
                    }))
                })
            };
        });

        socket.on('nextRoundReady', ({lobbyId}) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            game.readyNext = game.readyNext || new Set();
            game.readyNext.add(socket.id);

            if(game.readyNext.size === game.players.length) {
                game.readyNext.clear();
                io.to(lobbyId).emit('prepareNextRound');
            }
        })
    })
}