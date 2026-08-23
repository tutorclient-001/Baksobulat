import { getPool, ensureDatabaseConnected } from '../config/database.js';
import { config } from '../config/env.js';

export async function runMigrations(): Promise<void> {
  console.log('🔄 Menjalankan migrasi database Neon PostgreSQL...');

  if (!config.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL tidak ditemukan. Atur DATABASE_URL terlebih dahulu.');
    process.exit(1);
  }

  await ensureDatabaseConnected();
  const pool = getPool();
  if (!pool) {
    console.error('❌ Error: Gagal menginisialisasi connection pool database.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'USER',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS education_levels (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        description TEXT,
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS grade_levels (
        id VARCHAR(64) PRIMARY KEY,
        level_id VARCHAR(64) REFERENCES education_levels(id) ON DELETE SET NULL,
        level_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subjects (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        category VARCHAR(64) DEFAULT 'Umum',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS search_tags (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        color VARCHAR(32) DEFAULT 'indigo',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(64) PRIMARY KEY,
        document_code VARCHAR(64) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id VARCHAR(64) REFERENCES categories(id) ON DELETE RESTRICT,
        level_id VARCHAR(64) REFERENCES education_levels(id) ON DELETE SET NULL,
        level_name VARCHAR(64),
        academic_year VARCHAR(32) NOT NULL,
        semester VARCHAR(16) NOT NULL,
        subject VARCHAR(128) NOT NULL,
        grade VARCHAR(32) NOT NULL,
        tags JSONB DEFAULT '[]'::jsonb,
        question_count INT NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_by VARCHAR(64) REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS document_files (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        google_drive_file_id VARCHAR(255) NOT NULL,
        google_drive_folder_id VARCHAR(255),
        original_filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(64) NOT NULL DEFAULT 'application/pdf',
        file_size BIGINT NOT NULL,
        file_hash VARCHAR(128) NOT NULL,
        file_type VARCHAR(32) NOT NULL DEFAULT 'QUESTION',
        file_data_base64 TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS answer_keys (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(64) UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        total_questions INT NOT NULL DEFAULT 0,
        passing_score NUMERIC(5,2) DEFAULT 75,
        max_score NUMERIC(6,2) DEFAULT 100,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_by VARCHAR(64) REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS institution_settings (
        id VARCHAR(64) PRIMARY KEY,
        institution_name VARCHAR(255) NOT NULL DEFAULT 'Bank Soal Sekolah / Madrasah',
        institution_logo TEXT,
        address TEXT,
        phone VARCHAR(64),
        email VARCHAR(128),
        academic_year_active VARCHAR(32) DEFAULT '2025/2026',
        semester_active VARCHAR(16) DEFAULT 'GENAP',
        max_file_size_mb INT NOT NULL DEFAULT 25,
        storage_provider VARCHAR(32) NOT NULL DEFAULT 'google-drive',
        google_drive_folder_id VARCHAR(255),
        google_service_account_email VARCHAR(255),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(64)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        action VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(64),
        metadata JSONB,
        ip_address VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(document_code);
      CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
      CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject);
      CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(academic_year);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_doc_files_doc_id ON document_files(document_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
    `);

    console.log('✅ Migrasi database PostgreSQL selesai dengan sukses.');
  } catch (err: any) {
    console.error('❌ Gagal menjalankan migrasi database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly as a CLI script
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
