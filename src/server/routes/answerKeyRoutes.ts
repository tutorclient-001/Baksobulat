import { Router } from 'express';
import { answerKeyController } from '../controllers/answerKeyController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:documentId', requireAuth, (req, res, next) =>
  answerKeyController.getByDocumentId(req, res, next)
);

router.post('/:documentId', requireAuth, requireRole('ADMIN', 'TUTOR'), (req, res, next) =>
  answerKeyController.save(req, res, next)
);

router.delete('/:documentId', requireAuth, requireRole('ADMIN', 'TUTOR'), (req, res, next) =>
  answerKeyController.delete(req, res, next)
);

export default router;
