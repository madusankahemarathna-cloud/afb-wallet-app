import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { initSocket } from './socket';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 AFB Closed-Loop QR Payment Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time cashier notifications`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});
