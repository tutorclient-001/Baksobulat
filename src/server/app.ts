import express, { Request, Response } from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { checkDbHealth, ensureDatabaseConnected } from './config/database.js';
import { googleDriveService } from './services/googleDriveService.js';
import { config } from './config/env.js';

export const app = express();

app.set('trust proxy', 1);

// Configure CORS
const allowedOrigin = config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN;
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Basic Cookie Parser Middleware
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

// Root & API Health Check Handlers
const handleHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  });
};

const handleHealthReady = async (_req: Request, res: Response) => {
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
};

app.get('/health', handleHealth);
app.get('/health/ready', handleHealthReady);
app.get('/api/health', handleHealth);
app.get('/api/health/ready', handleHealthReady);

// Mount API Routes
app.use('/api', apiRouter);

// Fallback for unmatched /api routes to prevent HTML response
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint API ${req.method} ${req.originalUrl} tidak ditemukan pada server backend.`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
