import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/routes/index.js';
import { errorHandler } from './src/server/middleware/errorHandler.js';
import { initDatabase, checkDbHealth } from './src/server/config/database.js';
import { googleDriveService } from './src/server/services/googleDriveService.js';
import { seedDatabase } from './src/server/db/seed.js';
import { config } from './src/server/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || config.PORT || 3000);

  // Enable trust proxy for Google Cloud Run / reverse proxies
  app.set('trust proxy', 1);

  // Middlewares
  app.use(cors({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic Cookie Parser
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie;
    (req as any).cookies = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach((c) => {
        const parts = c.trim().split('=');
        if (parts.length === 2) {
          (req as any).cookies[parts[0]] = decodeURIComponent(parts[1]);
        }
      });
    }
    next();
  });

  // Health Checks
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    const dbHealth = await checkDbHealth();
    const driveHealth = await googleDriveService.checkDriveHealth();

    const isReady = dbHealth.healthy;
    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'unhealthy',
      database: dbHealth,
      storage: {
        provider: config.STORAGE_PROVIDER,
        driveHealthy: driveHealth.healthy,
        details: driveHealth,
      },
    });
  });

  // Mount API
  app.use('/api', apiRouter);

  // Error Handler
  app.use(errorHandler);

  // Initialize DB and Seed
  await initDatabase();
  await seedDatabase();

  // Vite integration or static file serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`Bank Soal PDF Server running on port ${PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`API URL: http://0.0.0.0:${PORT}/api`);
    console.log(`Health URL: http://0.0.0.0:${PORT}/health/ready`);
    console.log(`Default Admin: ${config.SEED_ADMIN_EMAIL}`);
    console.log(`Default User : ${config.SEED_USER_EMAIL}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Bank Soal server:', err);
  process.exit(1);
});
