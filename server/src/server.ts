import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { initSocket } from './socket';
import { prisma } from './prisma';
import { seedDatabase } from './seed';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, async () => {
  console.log(`🚀 AFB Closed-Loop QR Payment Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time cashier notifications`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);

  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('🌱 Database is empty. Running auto-seed for demo users and outlets...');
      await seedDatabase();
      console.log('✅ Auto-seed completed successfully!');
    }
  } catch (err) {
    console.error('⚠️ Auto-seed check notice:', err);
  }
});
