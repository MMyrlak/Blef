const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require("path");
require('dotenv').config();

const app = express();

const server = http.createServer(app);
const io = new Server(server, { 
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }});

app.use(cors());
app.use(express.json());

app.use('/api/lobby', require('./routes/lobby'));

require('./sockets/game')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT,'0.0.0.0', () => {
    console.log('Server running on http://192.168.100.119:3001');
})