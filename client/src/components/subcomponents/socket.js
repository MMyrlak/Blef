import { io } from 'socket.io-client';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168');

const BACKEND_URL = isLocal 
  ? `http://${window.location.hostname}:3001` 
  : "https://blef-7tj3.onrender.com"; 

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  secure: !isLocal 
});

export default socket;