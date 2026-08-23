import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// Centralized schema definition
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Neon PostgreSQL Database URL
  DATABASE_URL: isProd
    ? z.string().min(1, 'DATABASE_URL wajib diisi pada mode production.')
    : z.string().optional().default(''),

  // JWT Secret Key (strictly required in production with min 32 chars)
  AUTH_SECRET: isProd
    ? z.string().min(32, 'AUTH_SECRET wajib diisi dan memiliki panjang minimal 32 karakter pada mode production.')
    : z.string().default('bank-soal-dev-secret-key-at-least-32-chars-length'),

  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Google Drive Storage Integration
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(''),
  GOOGLE_PRIVATE_KEY: z.string().optional().default(''),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional().default(''),
  
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  STORAGE_PROVIDER: z.enum(['google-drive', 'mock']).default(isProd ? 'google-drive' : 'mock'),
  
  CORS_ORIGIN: z.string().default('*'),
  
  // Seed configurations for explicit 'npm run db:seed'
  SEED_ADMIN_EMAIL: z.string().default('admin@banksoal.sch.id'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin#2026!'),
  SEED_USER_EMAIL: z.string().default('guru@banksoal.sch.id'),
  SEED_USER_PASSWORD: z.string().default('Tutor#2026!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Konfigurasi Environment Variable tidak valid:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
  });

  if (isProd) {
    throw new Error(`Environment validation failed for production: ${parsed.error.message}`);
  }
}

export const config = parsed.success
  ? parsed.data
  : envSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      AUTH_SECRET: process.env.AUTH_SECRET || 'bank-soal-dev-secret-key-at-least-32-chars-length',
      DATABASE_URL: process.env.DATABASE_URL || '',
    });
