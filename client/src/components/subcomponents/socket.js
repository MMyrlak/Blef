import { io } from 'socket.io-client';

const socket = io.connect('https://localhost:3001', {
  secure: true,
  transports: ['websocket']
});

export default socket;