import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { answerKeyService } from '../services/answerKeyService.js';
import { AuthRequest } from '../middleware/auth.js';

const answerKeyItemSchema = z.object({
  number: z.number().int().min(1),
  type: z.enum(['PG', 'PGK', 'TF', 'ESSAY']),
  optionsCount: z.number().int().min(2).max(10).default(5),
  correctAnswers: z.array(z.string()).default([]),
  essayKeywords: z.array(z.string()).optional(),
  essayRubric: z.string().optional(),
  weight: z.number().min(0.1).default(1),
  explanation: z.string().optional(),
});

const saveAnswerKeySchema = z.object({
  items: z.array(answerKeyItemSchema),
  passing_score: z.number().min(0).max(100).default(75),
});

export class AnswerKeyController {
  async getByDocumentId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const answerKey = await answerKeyService.getByDocumentId(req.params.documentId);
      res.status(200).json({
        success: true,
        data: answerKey,
      });
    } catch (err) {
      next(err);
    }
  }

  async save(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = saveAnswerKeySchema.parse(req.body);
      const saved = await answerKeyService.saveAnswerKey(
        req.params.documentId,
        validated.items,
        validated.passing_score,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: saved,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await answerKeyService.deleteAnswerKey(req.params.documentId, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Kunci jawaban berhasil dihapus.' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const answerKeyController = new AnswerKeyController();
