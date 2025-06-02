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
        origin: [process.env.CORS_ORIGIN],
        methods: ['GET','POST'],
        credentials: true
    }
    });

app.use(cors({
        origin: [process.env.CORS_ORIGIN],
    methods: ['GET','POST'],
    credentials: true
}));
app.use(express.json());

app.use('/api/lobby', require('./routes/lobby'));

require('./sockets/game')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on ${process.env.IP_ADDRES}:${process.env.PORT}`);
})