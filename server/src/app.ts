import express from 'express';
import cors from 'cors';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: '*',
    credentials: true
  }));

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      system: 'Air Force Base Closed-Loop QR & Digital Wallet',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API routes
  app.use('/api', routes);

  return app;
}
