import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { InstitutionSettings } from '../../shared/types.js';
import { googleDriveService } from '../services/googleDriveService.js';

export class SettingsRepository {
  async getSettings(): Promise<InstitutionSettings> {
    const isDriveConfigured = googleDriveService.getIsConfigured();
    const isDbConnected = isDbPostgres();

    if (isDbPostgres()) {
      const res = await query<InstitutionSettings>('SELECT * FROM institution_settings LIMIT 1');
      if (res.rows.length > 0) {
        return {
          ...res.rows[0],
          is_drive_connected: isDriveConfigured,
          is_database_connected: isDbConnected,
        };
      }
    }

    if (!memoryStore.institutionSettings) {
      memoryStore.institutionSettings = {
        id: 'settings_default',
        institution_name: 'Bank Soal Pusat Pembelajaran',
        institution_logo: '',
        address: 'Jl. Pendidikan No. 45, Jakarta',
        phone: '(021) 7890123',
        email: 'admin@banksoal.sch.id',
        academic_year_active: '2025/2026',
        semester_active: 'GENAP',
        max_file_size_mb: 25,
        storage_provider: isDriveConfigured ? 'google-drive' : 'mock',
        google_drive_folder_id: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
        google_service_account_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
        updated_at: new Date().toISOString(),
      };
    }

    return {
      ...memoryStore.institutionSettings,
      is_drive_connected: isDriveConfigured,
      is_database_connected: isDbConnected,
    };
  }

  async updateSettings(
    data: Partial<InstitutionSettings>,
    userId?: string
  ): Promise<InstitutionSettings> {
    const current = await this.getSettings();
    const now = new Date().toISOString();

    const updated: InstitutionSettings = {
      ...current,
      ...data,
      updated_at: now,
      updated_by: userId || current.updated_by,
    };

    if (isDbPostgres()) {
      await query(
        `INSERT INTO institution_settings (id, institution_name, institution_logo, address, phone, email, academic_year_active, semester_active, max_file_size_mb, storage_provider, google_drive_folder_id, google_service_account_email, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
         ON CONFLICT (id) DO UPDATE SET
           institution_name = EXCLUDED.institution_name,
           institution_logo = EXCLUDED.institution_logo,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           academic_year_active = EXCLUDED.academic_year_active,
           semester_active = EXCLUDED.semester_active,
           max_file_size_mb = EXCLUDED.max_file_size_mb,
           storage_provider = EXCLUDED.storage_provider,
           google_drive_folder_id = EXCLUDED.google_drive_folder_id,
           google_service_account_email = EXCLUDED.google_service_account_email,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
        [
          updated.id || 'settings_default',
          updated.institution_name,
          updated.institution_logo || null,
          updated.address || null,
          updated.phone || null,
          updated.email || null,
          updated.academic_year_active || '2025/2026',
          updated.semester_active || 'GENAP',
          updated.max_file_size_mb || 25,
          updated.storage_provider || 'google-drive',
          updated.google_drive_folder_id || null,
          updated.google_service_account_email || null,
          userId || null,
        ]
      );
    }

    memoryStore.institutionSettings = updated;
    return updated;
  }
}

export const settingsRepository = new SettingsRepository();
