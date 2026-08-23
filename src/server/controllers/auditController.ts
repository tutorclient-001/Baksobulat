import { Response, NextFunction } from 'express';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuditController {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const logs = await auditLogRepository.listRecent(limit);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
