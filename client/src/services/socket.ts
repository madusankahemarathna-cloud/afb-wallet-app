import { io, Socket } from 'socket.io-client';
import { getServerBaseUrl } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = getServerBaseUrl() || window.location.origin;
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to AFB Real-time Payment WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
    });
  }
  return socket;
}

export function joinUserRoom(userId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_user', userId);
  } else {
    s.once('connect', () => s.emit('join_user', userId));
  }
}

export function joinOutletRoom(outletId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_outlet', outletId);
  } else {
    s.once('connect', () => s.emit('join_outlet', outletId));
  }
}

export function joinMerchantRoom(merchantUserId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_merchant', merchantUserId);
  } else {
    s.once('connect', () => s.emit('join_merchant', merchantUserId));
  }
}
