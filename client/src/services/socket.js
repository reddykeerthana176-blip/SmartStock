import { io } from 'socket.io-client';

let socket = null;

export const initClientSocket = (businessId, token) => {
  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to real-time server with ID:', socket.id);
    if (businessId) {
      socket.emit('join_business', businessId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected from server:', reason);
  });

  return socket;
};

export const getClientSocket = () => socket;

export const disconnectClientSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
