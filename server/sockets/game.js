const db = require('../db/connection');
const activeGames = new Map();

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
            const activePlayers = game.players.filter(p => p.id !== null);
            io.to(lobbyId).emit('playerUpdate', activePlayers);
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
            do {
                const [row] = await db.query('SELECT pair_id FROM question_pairs ORDER BY RAND() LIMIT 1');
                
                pairId = row[0]?.pair_id;
            } while (game.usedQuestionPair.includes(pairId))
            
            game.usedQuestionPair.push(pairId);
            // pobranie pytania
            const [questions] = await db.query('SELECT * FROM question_pairs WHERE pair_id = ?', [pairId]);
            const questionForAll = questions.find(q=> q.for_impostor === 0);
            const questionForImpostor = questions.find(q=> q.for_impostor === 1);
            game.stage = "question";
            //wyślij pytanie
            for(const player of game.players) {
                const question = player.id === game.impostorId ? questionForImpostor.content : questionForAll.content;
                io.to(player.id).emit('question', {
                    question
                });
            };
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
                game.stage = 'result';
                io.to(lobbyId).emit('roundResult', {
                    gameStage: game.stage,
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

        socket.on('nextRoundReady', async ({ lobbyId }) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            game.readyNext = game.readyNext || new Set();
            game.readyNext.add(socket.id);

            const activePlayers = game.players.filter(p => p.id !== null);

            if (game.readyNext.size === activePlayers.length) {
                game.readyNext.clear();
                game.stage = 'nextRound';

                game.answer = [];
                game.votes = [];

                const randomIndex = Math.floor(Math.random() * activePlayers.length);
                const impostor = activePlayers[randomIndex];
                game.impostorId = impostor.id;

                let pairId;
                let row, questions;

                do {
                    [row] = await db.query('SELECT pair_id FROM question_pair ORDER BY RAND() LIMIT 1');
                    pairId = row[0]?.pair_id;
                } while (game.usedQuestionPair.includes(pairId));

                game.usedQuestionPair.push(pairId);

                [questions] = await db.query('SELECT * FROM question_pair WHERE pair_id = ?', [pairId]);
                const questionForAll = questions.find(q => q.for_impostor === 0);
                const questionForImpostor = questions.find(q => q.for_impostor === 1);

                game.stage = 'question';
                for (const player of activePlayers) {
                    const question = player.id === game.impostorId ? questionForImpostor.content : questionForAll.content;
                    io.to(player.id).emit('question', {
                        question,
                        gameStage: game.stage
                    });
                }

                io.to(lobbyId).emit('roundStarted', {
                    round: ++game.round,
                    players: activePlayers,
                    gameStage: game.stage
                });
            }
        });
    })
}
