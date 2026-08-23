import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/userRepository.js';
import { authService } from '../services/authService.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { AuthRequest } from '../middleware/auth.js';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama pengguna minimal 2 karakter.'),
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
  role: z.enum(['ADMIN', 'TUTOR', 'VIEWER']).default('TUTOR'),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'TUTOR', 'VIEWER']).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export class UserController {
  async list(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userRepository.listAll();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = await authService.createUser({
        ...validated,
        actorUserId: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateUserSchema.parse(req.body);
      const updated = await userRepository.update(req.params.id, validated);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan.' },
        });
        return;
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user!.id,
        action: 'UPDATE_USER',
        entity_type: 'USER',
        entity_id: req.params.id,
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

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.id === req.params.id) {
        res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DELETE_SELF', message: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        });
        return;
      }

      const success = await userRepository.delete(req.params.id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan.' },
        });
        return;
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user!.id,
        action: 'DELETE_USER',
        entity_type: 'USER',
        entity_id: req.params.id,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Pengguna berhasil dihapus.' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
