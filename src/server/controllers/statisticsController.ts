import { Response, NextFunction } from 'express';
import { statisticsService } from '../services/statisticsService.js';
import { AuthRequest } from '../middleware/auth.js';

export class StatisticsController {
  async getOverview(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await statisticsService.getOverview();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const statisticsController = new StatisticsController();
