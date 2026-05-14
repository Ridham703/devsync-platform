import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Configure reusable Socket io connection wrapper
const socket = io(SOCKET_URL, {
  autoConnect: false, // We manually trigger connect on page mount
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});

// Useful logs for development connectivity troubleshooting
socket.on('connect', () => {});
socket.on('connect_error', () => {});

export default socket;
