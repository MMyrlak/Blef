import { io } from 'socket.io-client';

const socket = io.connect('http://192.168.100.119:3001', {
  secure: true,
  transports: ['websocket']
});

export default socket;