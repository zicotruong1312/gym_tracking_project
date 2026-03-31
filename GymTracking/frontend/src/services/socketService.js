import { io } from 'socket.io-client';
import { API_ORIGIN } from '../config/api';

let socket;

export function getSocket() {
  return socket;
}

export function connectHealthSocket(token) {
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(API_ORIGIN, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('healthflow:update', (payload) => {
    window.dispatchEvent(new CustomEvent('healthflow:refresh', { detail: payload }));
  });

  socket.on('connect_error', () => {
    /* optional: toast */
  });

  return socket;
}

export function disconnectHealthSocket() {
  if (socket) {
    socket.off('healthflow:update');
    socket.disconnect();
    socket = null;
  }
}
