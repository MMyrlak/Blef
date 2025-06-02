import { io } from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_BACKEND_IP, {
  secure: true,
  transports: ['websocket']
});

export default socket;