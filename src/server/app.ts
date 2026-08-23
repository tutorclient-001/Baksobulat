import express, { Request, Response } from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase, checkDbHealth } from './config/database.js';
import { googleDriveService } from './services/googleDriveService.js';
import { seedDatabase } from './db/seed.js';
import { config } from './config/env.js';

export const app = express();

app.set('trust proxy', 1);

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

// Global initialization flag
let isInitialized = false;
export async function ensureInitialized() {
  if (!isInitialized) {
    await initDatabase();
    await seedDatabase();
    isInitialized = true;
  }
}
