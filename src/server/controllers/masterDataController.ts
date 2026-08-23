import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { masterDataRepository } from '../repositories/masterDataRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { AuthRequest } from '../middleware/auth.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

// Schemas
const levelSchema = z.object({
  name: z.string().min(2, 'Nama jenjang minimal 2 karakter.'),
  code: z.string().min(1, 'Kode jenjang wajib diisi.'),
  description: z.string().optional().default(''),
  order_index: z.number().optional().default(0),
});

const gradeSchema = z.object({
  level_id: z.string().optional(),
  level_name: z.string().optional(),
  name: z.string().min(1, 'Nama kelas wajib diisi.'),
  code: z.string().min(1, 'Kode kelas wajib diisi.'),
  order_index: z.number().optional().default(0),
});

const subjectSchema = z.object({
  name: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter.'),
  code: z.string().min(1, 'Kode mata pelajaran wajib diisi.'),
  category: z.string().optional().default('Umum'),
  description: z.string().optional().default(''),
});

const tagSchema = z.object({
  name: z.string().min(2, 'Nama tag minimal 2 karakter.'),
  slug: z.string().optional(),
  color: z.string().optional().default('indigo'),
  description: z.string().optional().default(''),
});

export class MasterDataController {
  // All master metadata in one request
  async getAllMaster(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [categories, levels, grades, subjects, tags] = await Promise.all([
        categoryRepository.listAll(false),
        masterDataRepository.listEducationLevels(),
        masterDataRepository.listGradeLevels(),
        masterDataRepository.listSubjects(),
        masterDataRepository.listSearchTags(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          categories,
          levels,
          grades,
          subjects,
          tags,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // JENJANG (EDUCATION LEVELS) CRUD
  // ==========================================
  async listLevels(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await masterDataRepository.listEducationLevels();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = levelSchema.parse(req.body);
      const id = `lvl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const created = await masterDataRepository.createEducationLevel({ id, ...body });

      await auditLogRepository.log({
        id: `audit_${Date.now()}`,
        user_id: req.user?.id,
        action: 'CREATE_LEVEL',
        entity_type: 'MASTER_LEVEL',
        entity_id: id,
        metadata: { name: body.name },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async updateLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = levelSchema.partial().parse(req.body);
      const updated = await masterDataRepository.updateEducationLevel(req.params.id, body);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Jenjang tidak ditemukan.' } });
        return;
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}`,
        user_id: req.user?.id,
        action: 'UPDATE_LEVEL',
        entity_type: 'MASTER_LEVEL',
        entity_id: req.params.id,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await masterDataRepository.deleteEducationLevel(req.params.id);
      res.status(200).json({ success: true, data: { message: 'Jenjang berhasil dihapus.' } });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // KELAS (GRADE LEVELS) CRUD
  // ==========================================
  async listGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const levelId = req.query.level_id as string | undefined;
      const data = await masterDataRepository.listGradeLevels(levelId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = gradeSchema.parse(req.body);
      const id = `grd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const created = await masterDataRepository.createGradeLevel({ id, ...body });

      await auditLogRepository.log({
        id: `audit_${Date.now()}`,
        user_id: req.user?.id,
        action: 'CREATE_GRADE',
        entity_type: 'MASTER_GRADE',
        entity_id: id,
        metadata: { name: body.name },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async updateGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = gradeSchema.partial().parse(req.body);
      const updated = await masterDataRepository.updateGradeLevel(req.params.id, body);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Kelas tidak ditemukan.' } });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await masterDataRepository.deleteGradeLevel(req.params.id);
      res.status(200).json({ success: true, data: { message: 'Kelas berhasil dihapus.' } });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // MATA PELAJARAN (SUBJECTS) CRUD
  // ==========================================
  async listSubjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cat = req.query.category as string | undefined;
      const data = await masterDataRepository.listSubjects(cat);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = subjectSchema.parse(req.body);
      const id = `sbj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const created = await masterDataRepository.createSubject({ id, ...body });

      await auditLogRepository.log({
        id: `audit_${Date.now()}`,
        user_id: req.user?.id,
        action: 'CREATE_SUBJECT',
        entity_type: 'MASTER_SUBJECT',
        entity_id: id,
        metadata: { name: body.name },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async updateSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = subjectSchema.partial().parse(req.body);
      const updated = await masterDataRepository.updateSubject(req.params.id, body);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mata pelajaran tidak ditemukan.' } });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await masterDataRepository.deleteSubject(req.params.id);
      res.status(200).json({ success: true, data: { message: 'Mata pelajaran berhasil dihapus.' } });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // TAGS PENCARIAN (SEARCH TAGS) CRUD
  // ==========================================
  async listTags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await masterDataRepository.listSearchTags();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = tagSchema.parse(req.body);
      const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const id = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const created = await masterDataRepository.createSearchTag({ id, ...body, slug });

      await auditLogRepository.log({
        id: `audit_${Date.now()}`,
        user_id: req.user?.id,
        action: 'CREATE_TAG',
        entity_type: 'MASTER_TAG',
        entity_id: id,
        metadata: { name: body.name },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }

  async updateTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = tagSchema.partial().parse(req.body);
      const updated = await masterDataRepository.updateSearchTag(req.params.id, body);
      if (!updated) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag tidak ditemukan.' } });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await masterDataRepository.deleteSearchTag(req.params.id);
      res.status(200).json({ success: true, data: { message: 'Tag pencarian berhasil dihapus.' } });
    } catch (err) {
      next(err);
    }
  }
}

export const masterDataController = new MasterDataController();
