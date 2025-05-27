const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        }});

app.use(cors());
app.use(express.json());

app.use('/api/lobby', require('./routes/lobby'));

require('./sockets/game')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serwer nasłuchuje na ${PORT}`);
})