import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { AuthRequest } from '../middleware/auth.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '';
      const userAgent = req.headers['user-agent'] || '';

      const { user, accessToken } = await authService.login(
        validated.email,
        validated.password,
        ipAddress,
        userAgent
      );

      // Also set HttpOnly cookie for extra security
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await auditLogRepository.log({
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: req.user.id,
          action: 'LOGOUT',
          entity_type: 'USER',
          entity_id: req.user.id,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });
      }

      res.clearCookie('access_token');
      res.status(200).json({
        success: true,
        data: { message: 'Berhasil keluar sistem.' },
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Sesi belum terautentikasi.' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user: req.user },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
