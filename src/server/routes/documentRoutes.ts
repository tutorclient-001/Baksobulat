import { Router } from 'express';
import { documentController } from '../controllers/documentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Document Listing and Details
router.get('/', requireAuth, (req, res, next) => documentController.list(req, res, next));
router.get('/:id', requireAuth, (req, res, next) => documentController.getById(req, res, next));

// Document CRUD (Admin & Tutor)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TUTOR'),
  uploadLimiter,
  uploadMiddleware.fields([
    { name: 'question_pdf', maxCount: 1 },
    { name: 'answer_key_pdf', maxCount: 1 },
  ]),
  (req, res, next) => documentController.create(req, res, next)
);

router.put('/:id', requireAuth, requireRole('ADMIN', 'TUTOR'), (req, res, next) =>
  documentController.update(req, res, next)
);

router.post(
  '/:id/replace-file',
  requireAuth,
  requireRole('ADMIN', 'TUTOR'),
  uploadLimiter,
  uploadMiddleware.single('file'),
  (req, res, next) => documentController.replaceFile(req, res, next)
);

// Trash & Lifecycle (Admin Only)
router.post('/:id/trash', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  documentController.trash(req, res, next)
);

router.post('/:id/restore', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  documentController.restore(req, res, next)
);

router.delete('/:id/permanent', requireAuth, requireRole('ADMIN'), (req, res, next) =>
  documentController.permanentDelete(req, res, next)
);

// File Streams: Question PDF
router.get('/:id/preview', requireAuth, (req, res, next) =>
  documentController.preview(req, res, next)
);

router.get('/:id/download', requireAuth, (req, res, next) =>
  documentController.download(req, res, next)
);

// File Streams: Answer Key PDF
router.get('/:id/answer-key/preview', requireAuth, (req, res, next) =>
  documentController.previewAnswerKey(req, res, next)
);

router.get('/:id/answer-key/download', requireAuth, (req, res, next) =>
  documentController.downloadAnswerKey(req, res, next)
);

// Export LJK in Excel format (.xlsx)
router.get('/:id/export-ljk', requireAuth, (req, res, next) =>
  documentController.exportLjkExcel(req, res, next)
);

export default router;
