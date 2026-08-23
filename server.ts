import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { app, ensureInitialized } from './src/server/app.js';
import { config } from './src/server/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT || config.PORT || 3000);

  // Initialize DB and Seed
  await ensureInitialized();

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
