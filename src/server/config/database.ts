import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './env.js';

let pool: Pool | null = null;
let isConnectedToPostgres = false;
let isConnecting = false;
let connectPromise: Promise<boolean> | null = null;
let isMigrated = false;

// In-memory store for development/testing when DATABASE_URL is not configured
export const memoryStore = {
  users: [] as any[],
  categories: [] as any[],
  educationLevels: [] as any[],
  gradeLevels: [] as any[],
  subjects: [] as any[],
  searchTags: [] as any[],
  documents: [] as any[],
  documentFiles: [] as any[],
  answerKeys: [] as any[],
  institutionSettings: null as any,
  auditLogs: [] as any[],
  refreshTokens: [] as any[],
};

export function getPool(): Pool | null {
  if (!pool && config.DATABASE_URL && config.DATABASE_URL.trim() !== '') {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function ensureDatabaseConnected(): Promise<boolean> {
  if (isConnectedToPostgres && isMigrated) return true;
  if (!config.DATABASE_URL || config.DATABASE_URL.trim() === '') {
    isConnectedToPostgres = false;
    return false;
  }

  if (isConnecting && connectPromise) {
    return connectPromise;
  }

  isConnecting = true;
  connectPromise = (async () => {
    try {
      const p = getPool();
      if (!p) {
        isConnectedToPostgres = false;
        return false;
      }

      const client = await p.connect();
      await client.query('SELECT 1');
      client.release();

      isConnectedToPostgres = true;
      console.log('✅ PostgreSQL database connected successfully.');

      // Auto-create tables & seed default admin if not yet migrated
      if (!isMigrated) {
        try {
          const { runMigrations } = await import('../db/migrate.js');
          const { seedDatabase } = await import('../db/seed.js');
          await runMigrations();
          await seedDatabase();
          isMigrated = true;
        } catch (mErr: any) {
          console.warn('⚠️ Auto-migration notice:', mErr.message);
        }
      }

      return true;
    } catch (err: any) {
      console.warn('⚠️ Could not connect to PostgreSQL database:', err.message);
      isConnectedToPostgres = false;
      return false;
    } finally {
      isConnecting = false;
    }
  })();

  return connectPromise;
}

export function isDbPostgres(): boolean {
  return isConnectedToPostgres && pool !== null;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPool();
  if (p && isConnectedToPostgres) {
    return p.query<T>(text, params);
  }
  
  // Try connecting on demand if pool exists
  if (p) {
    await ensureDatabaseConnected();
    if (isConnectedToPostgres) {
      return p.query<T>(text, params);
    }
  }

  throw new Error('Database pool is not connected to PostgreSQL.');
}

export async function checkDbHealth(): Promise<{
  healthy: boolean;
  type: string;
  latencyMs?: number;
  error?: string;
}> {
  if (config.DATABASE_URL && config.DATABASE_URL.trim() !== '') {
    const start = Date.now();
    try {
      const p = getPool();
      if (!p) throw new Error('Pool not initialized');
      await p.query('SELECT 1');
      isConnectedToPostgres = true;
      return {
        healthy: true,
        type: 'Neon PostgreSQL',
        latencyMs: Date.now() - start,
      };
    } catch (e: any) {
      isConnectedToPostgres = false;
      return {
        healthy: false,
        type: 'Neon PostgreSQL',
        error: e.message,
      };
    }
  }

  return {
    healthy: true,
    type: 'Local Memory Storage (Development Mode)',
  };
}
