import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform((v) => parseInt(v, 10)),
  DATABASE_URL: z.string().optional().default(''),
  AUTH_SECRET: z.string().default('bank-soal-secure-jwt-secret-key-production-ready-2026'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(''),
  GOOGLE_PRIVATE_KEY: z.string().optional().default(''),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional().default(''),
  MAX_FILE_SIZE_MB: z.string().default('25').transform((v) => parseInt(v, 10)),
  STORAGE_PROVIDER: z.enum(['google-drive', 'mock']).default('google-drive'),
  CORS_ORIGIN: z.string().default('*'),
  SEED_ADMIN_EMAIL: z.string().default('admin@banksoal.sch.id'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@BankSoal2026'),
  SEED_USER_EMAIL: z.string().default('guru@banksoal.sch.id'),
  SEED_USER_PASSWORD: z.string().default('Guru@BankSoal2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  // In development we can warn, but in strict production we fail fast if critical vars are broken
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.warn('Production warning: DATABASE_URL is not configured.');
  }
}

export const config = parsed.success ? parsed.data : envSchema.parse({
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || '',
});
