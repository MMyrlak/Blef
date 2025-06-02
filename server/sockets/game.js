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
                playerCardId = Math.floor(Math.random() * 32) + 1;
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

            game.answer = [];
            game.votes = [];
            
            const randomIndex = Math.floor(Math.random() * game.players.length);
            const impostor = game.players[randomIndex];
            game.impostorNickname = impostor.nickname;

            let pairId;
            let row;

            do {
                [row] = await db.query('SELECT pair_id FROM question_pairs ORDER BY RAND() LIMIT 1');
                pairId = row[0]?.pair_id;
            } while (game.usedQuestionPair.includes(pairId));

            game.usedQuestionPair.push(pairId);
            
            const [questions] = await db.query('SELECT * FROM question_pairs WHERE pair_id = ?', [pairId]);
            const questionForAll = questions.find(q=> q.for_impostor === 0);
            const questionForImpostor = questions.find(q=> q.for_impostor === 1);
            
            for(const player of game.players) {
                const question = player.nickname === game.impostorNickname ? questionForImpostor.question : questionForAll.question;
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

            const existingAnswerIndex = game.answer.findIndex(a => a.nickname === player.nickname);

            if (existingAnswerIndex !== -1) {
                game.answer[existingAnswerIndex].playerAnswer = playerAnswer;
                game.answer[existingAnswerIndex].playerId = socket.id;
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

        socket.on('sendVote', ({lobbyId, votedNickname }) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            const voterPlayer = game.players.find(p => p.id === socket.id);
            if (!voterPlayer) return;
            const voterNickname = voterPlayer.nickname;
            const existingVoteIndex = game.votes.findIndex(v => v.voterNickname === voterNickname);
    
            if (existingVoteIndex !== -1) {
                    game.votes[existingVoteIndex].votedNickname = votedNickname;
                } else {
                    game.votes.push({
                        voterNickname: voterNickname,
                        votedNickname: votedNickname
                    });
                }
            const activePlayers = game.players.filter(p => p.id !== null);
            if( game.votes.length === activePlayers.length){
                const impostorNickname = game.impostorNickname;
                let impostor_points = 0;
                for (let player of game.players) {
                    if (player.nickname === impostorNickname) continue;
                    const foundCorrectVote = game.votes.some(v => 
                        v.voterNickname === player.nickname && 
                        v.votedNickname === impostorNickname
                    );
                    if (foundCorrectVote) {
                        player.score += 1;
                    } else {
                        impostor_points++;
                    }
                }
                const impostorPlayer = game.players.find(p => p.nickname === impostorNickname);
                if (impostorPlayer) {
                    impostorPlayer.score += impostor_points;
                }
                game.stage = 'result';
                io.to(lobbyId).emit('stageUpdate', game.stage);
                io.to(lobbyId).emit('roundResult', {
                votes: game.votes, // już zawierają nicki
                impostor: impostorNickname,
                scores: game.players.map(p => ({
                    nickname: p.nickname,
                    score: p.score,
                    playerCardId: p.playerCardId
                }))
            });
            };
        });

        socket.on('nextRoundReady', async ({ lobbyId }) => {
            const game = activeGames.get(lobbyId);
            if (!game) return;

            game.readyNext = game.readyNext || new Set();
                if (game.readyNext.has(socket.id)) {
                game.readyNext.delete(socket.id);
            } else {
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
