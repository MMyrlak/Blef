const db = require('../db/connection');
const activeGames = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('Połączono użytkownika o id: ', socket.id);

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
            const isHost = game.players.length === 0;
            game.players.push({id: socket.id, nickname, score: 0, isHost});
            io.to(lobbyId).emit('playerUpdate', game.players);
        });

        socket.on('disconnect', ()=>{
            for (let [lobbyId, game] of activeGames) {
                game.players = game.players.filter(p=> p.id !== socket.id);
                io.to(lobbyId).emit('playersUpdate', game.players);
            }
        })

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

            // pobranie pytania
            const [questions] = await db.query('SELECT * FROM question_pair WHERE pair_id = ?', [pairId]);

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

            if(game.answer.length === game.players.length) {
                const shuffled = game.answer.sort(()=> 0.5 - Math.random());
                io.to(lobbyId).emit('startVoting', {
                    shuffled,
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