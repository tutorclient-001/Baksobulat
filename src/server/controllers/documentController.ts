import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { documentService } from '../services/documentService.js';
import { excelLjkService } from '../services/excelLjkService.js';
import { answerKeyService } from '../services/answerKeyService.js';
import { processUploadedPdf } from '../middleware/upload.js';
import { AuthRequest } from '../middleware/auth.js';

const createDocumentSchema = z.object({
  title: z.string().min(3, 'Judul dokumen minimal 3 karakter.'),
  description: z.string().optional().default(''),
  category_id: z.string().min(1, 'Kategori dokumen wajib dipilih.'),
  level_id: z.string().optional(),
  level_name: z.string().optional(),
  academic_year: z.string().min(4, 'Tahun ajaran wajib diisi (misal: 2025/2026).'),
  semester: z.enum(['GANJIL', 'GENAP', 'ALL']).default('GANJIL'),
  subject: z.string().min(2, 'Mata pelajaran wajib diisi.'),
  grade: z.string().min(1, 'Tingkat / Kelas wajib diisi.'),
  tags: z.preprocess((v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [v];
      } catch {
        return v.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  }, z.array(z.string())).optional().default([]),
  question_count: z.preprocess((v) => (v ? parseInt(String(v), 10) : 0), z.number().min(0)),
});

const updateDocumentSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  level_id: z.string().optional(),
  level_name: z.string().optional(),
  academic_year: z.string().optional(),
  semester: z.enum(['GANJIL', 'GENAP', 'ALL']).optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  tags: z.preprocess((v) => {
    if (!v) return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [v];
      } catch {
        return v.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return undefined;
  }, z.array(z.string()).optional()),
  question_count: z.number().min(0).optional(),
});

export class DocumentController {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await documentService.listDocuments({
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
        search: req.query.search as string,
        categoryId: req.query.category_id as string,
        academicYear: req.query.academic_year as string,
        semester: req.query.semester as string,
        subject: req.query.subject as string,
        grade: req.query.grade as string,
        status: (req.query.status as any) || 'ACTIVE',
        hasAnswerKey: req.query.has_answer_key as any,
        sort: req.query.sort as string,
        order: req.query.order as any,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.getDocumentById(req.params.id);
      res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const questionFiles = files?.['question_pdf'];
      const answerKeyFiles = files?.['answer_key_pdf'];

      if (!questionFiles || questionFiles.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'File PDF Soal wajib diunggah.',
          },
        });
        return;
      }

      const validatedMeta = createDocumentSchema.parse(req.body);
      const processedQuestionPdf = processUploadedPdf(questionFiles[0]);
      const processedAnswerKeyPdf = answerKeyFiles && answerKeyFiles.length > 0
        ? processUploadedPdf(answerKeyFiles[0])
        : undefined;

      const newDoc = await documentService.createDocumentWithFiles({
        ...validatedMeta,
        question_count: validatedMeta.question_count ?? 40,
        userId: req.user!.id,
        questionPdf: processedQuestionPdf,
        answerKeyPdf: processedAnswerKeyPdf,
      });

      // If initial LJK data was provided in the upload flow, save it
      if (req.body.initial_ljk_data) {
        try {
          const ljkPayload = typeof req.body.initial_ljk_data === 'string'
            ? JSON.parse(req.body.initial_ljk_data)
            : req.body.initial_ljk_data;
          
          if (Array.isArray(ljkPayload.items) && ljkPayload.items.length > 0) {
            await answerKeyService.saveAnswerKey(
              newDoc.id,
              ljkPayload.items,
              Number(ljkPayload.passing_score) || 75,
              req.user!.id
            );
          }
        } catch (ljkErr) {
          console.error('Failed to parse initial LJK data:', ljkErr);
        }
      }

      // Re-fetch document with complete summary and files
      const fullDoc = await documentService.getDocumentById(newDoc.id);

      res.status(201).json({
        success: true,
        data: fullDoc || newDoc,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateDocumentSchema.parse(req.body);
      const updated = await documentService.updateDocument(req.params.id, validated, req.user!.id);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async replaceFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileType = req.body.file_type === 'ANSWER_KEY' ? 'ANSWER_KEY' : 'QUESTION';
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'File PDF baru wajib diunggah.' },
        });
        return;
      }

      const processed = processUploadedPdf(req.file);
      await documentService.replaceFile(req.params.id, fileType, processed, req.user!.id);

      const doc = await documentService.getDocumentById(req.params.id);
      res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  async trash(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await documentService.moveToTrash(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Dokumen berhasil dipindahkan ke Sampah (Trash).' },
      });
    } catch (err) {
      next(err);
    }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await documentService.restore(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Dokumen berhasil dipulihkan dari Sampah.' },
      });
    } catch (err) {
      next(err);
    }
  }

  async permanentDelete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await documentService.permanentDelete(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Dokumen dan file terkait telah dihapus permanen.' },
      });
    } catch (err) {
      next(err);
    }
  }

  async preview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileStream = await documentService.getFileStream(
        req.params.id,
        'QUESTION',
        req.user?.id,
        'PREVIEW',
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', fileStream.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileStream.filename}"`);
      if (fileStream.size) {
        res.setHeader('Content-Length', fileStream.size);
      }

      fileStream.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async download(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileStream = await documentService.getFileStream(
        req.params.id,
        'QUESTION',
        req.user?.id,
        'DOWNLOAD',
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', fileStream.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileStream.filename}"`);
      if (fileStream.size) {
        res.setHeader('Content-Length', fileStream.size);
      }

      fileStream.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async previewAnswerKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileStream = await documentService.getFileStream(
        req.params.id,
        'ANSWER_KEY',
        req.user?.id,
        'PREVIEW',
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', fileStream.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileStream.filename}"`);
      if (fileStream.size) {
        res.setHeader('Content-Length', fileStream.size);
      }

      fileStream.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async downloadAnswerKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileStream = await documentService.getFileStream(
        req.params.id,
        'ANSWER_KEY',
        req.user?.id,
        'DOWNLOAD',
        req.ip,
        req.headers['user-agent']
      );

      res.setHeader('Content-Type', fileStream.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileStream.filename}"`);
      if (fileStream.size) {
        res.setHeader('Content-Length', fileStream.size);
      }

      fileStream.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async exportLjkExcel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentService.getDocumentById(req.params.id);
      const answerKey = await answerKeyService.getByDocumentId(req.params.id);
      const mode = (req.query.mode as any) || 'BLANK_LJK';

      const excelBuffer = await excelLjkService.generateLjkWorkbook(doc, answerKey, mode);

      const filename = `Format_LJK_${doc.document_code}_${doc.subject.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      res.send(excelBuffer);
    } catch (err) {
      next(err);
    }
  }
}

export const documentController = new DocumentController();
