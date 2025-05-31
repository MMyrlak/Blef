const express = require('express');
const fs = require("fs");
const https = require('https');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require("path");
require('dotenv').config();

const app = express();

const keyPath = path.join(__dirname, "cert", "key.pem");
const certPath = path.join(__dirname, "cert", "cert.pem");

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);

const server = https.createServer({ key, cert }, app);
const io = new Server(server, { 
        cors: {
            origin: "*",
        }});

app.use(cors());
app.use(express.json());

app.use('/api/lobby', require('./routes/lobby'));

require('./sockets/game')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serwer nasłuchuje na ${PORT}`);
})