import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../src/server/app.js';
import { ensureDatabaseConnected } from '../src/server/config/database.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await ensureDatabaseConnected();
  } catch (err: any) {
    console.error('Serverless DB initialization warning:', err.message);
  }
  return (app as any)(req, res);
}
