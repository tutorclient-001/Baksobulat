import { app, ensureInitialized } from '../src/server/app.js';
import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureInitialized();
  return (app as any)(req, res);
}
