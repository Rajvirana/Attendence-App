import { io } from 'socket.io-client';
import { API_BASE } from './config';

/**
 * @param {string} token JWT
 * @returns {import('socket.io-client').Socket}
 */
export function createSocket(token) {
  const opts = {
    auth: { token },
    transports: ['websocket', 'polling'],
  };
  if (API_BASE) {
    return io(API_BASE, opts);
  }
  return io(opts);
}
