import { Response, NextFunction } from 'express';
import { reconciliationService } from '../services/reconciliationService.js';
import { AuthRequest } from '../middleware/auth.js';

export class ReconciliationController {
  async run(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reconciliationService.reconcile();
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reconciliationController = new ReconciliationController();
