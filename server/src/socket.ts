import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

let io: SocketIOServer | null = null;

export function initSocket(server: http.Server) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    // Client joins user-specific room
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Merchant joins outlet-specific room for POS terminal alerts
    socket.on('join_outlet', (outletId: string) => {
      if (outletId) {
        socket.join(`outlet:${outletId}`);
      }
    });

    socket.on('join_merchant', (merchantUserId: string) => {
      if (merchantUserId) {
        socket.join(`merchant:${merchantUserId}`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
}

export function notifyMerchantPayment(outletId: string, merchantUserId: string, payload: any) {
  if (io) {
    // Emit to outlet room (cashier terminal screens)
    io.to(`outlet:${outletId}`).emit('payment_received', payload);
    // Emit to merchant user room
    io.to(`merchant:${merchantUserId}`).emit('payment_received', payload);
    // Emit general live feed update
    io.emit('live_transaction_feed', payload);
  }
}

export function notifyUserTopup(userId: string, payload: any) {
  if (io) {
    io.to(`user:${userId}`).emit('topup_status_changed', payload);
  }
}
