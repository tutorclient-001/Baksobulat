import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { checkDbHealth } from '../config/database.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { AuthRequest } from '../middleware/auth.js';

const updateSettingsSchema = z.object({
  institution_name: z.string().min(2).optional(),
  institution_logo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  academic_year_active: z.string().optional(),
  semester_active: z.enum(['GANJIL', 'GENAP']).optional(),
  max_file_size_mb: z.number().min(1).max(100).optional(),
  storage_provider: z.enum(['google-drive', 'mock']).optional(),
  google_drive_folder_id: z.string().optional(),
  google_service_account_email: z.string().optional(),
});

export class SettingsController {
  async getSettings(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsRepository.getSettings();
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSettingsSchema.parse(req.body);
      const updated = await settingsRepository.updateSettings(validated, req.user?.id);

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user?.id,
        action: 'UPDATE_SETTINGS',
        entity_type: 'SETTINGS',
        metadata: { updates: validated },
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async testDrive(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await googleDriveService.checkDriveHealth();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async testDatabase(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await checkDbHealth();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
