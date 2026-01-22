import { io } from 'socket.io-client';

const socket = io("https://blef-7tj3.onrender.com", {
  transports: ['websocket'], // Wymuszenie websocketów jest kluczowe na Renderze
  secure: true,
  reconnection: true,
  reconnectionAttempts: 5
});

export default socket;