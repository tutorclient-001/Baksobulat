import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { app } from './src/server/app.js';
import { config } from './src/server/config/env.js';
import { ensureDatabaseConnected } from './src/server/config/database.js';
import { seedDatabase } from './src/server/db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT || config.PORT || 3000);

  // Initialize DB connection
  await ensureDatabaseConnected();

  // In development mode, auto-seed memory/db if needed
  if (config.NODE_ENV !== 'production') {
    try {
      await seedDatabase();
    } catch (err: any) {
      console.warn('Dev seed notice:', err.message);
    }
  }

  // Vite integration in development or static serving in production
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
    console.log(`🚀 Bank Soal PDF Server active on port ${PORT}`);
    console.log(`🌍 Environment : ${config.NODE_ENV}`);
    console.log(`📡 API URL     : http://localhost:${PORT}/api`);
    console.log(`❤️ Health Check: http://localhost:${PORT}/api/health/ready`);
    console.log(`====================================================`);
  });
}

// Only start listener if executed directly via Node/tsx
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start Bank Soal server:', err);
    process.exit(1);
  });
}
