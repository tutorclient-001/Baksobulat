import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { AuthRequest } from '../middleware/auth.js';

const categorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter.'),
  slug: z.string().min(2, 'Slug minimal 2 karakter.'),
  description: z.string().optional().default(''),
});

export class CategoryController {
  async list(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryRepository.listAll();
      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = categorySchema.parse(req.body);

      const existingSlug = await categoryRepository.findBySlug(validated.slug);
      if (existingSlug && !existingSlug.is_deleted) {
        res.status(409).json({
          success: false,
          error: { code: 'SLUG_EXISTS', message: 'Slug kategori sudah digunakan.' },
        });
        return;
      }

      const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newCategory = await categoryRepository.create({
        id,
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
      });

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user!.id,
        action: 'CREATE_CATEGORY',
        entity_type: 'CATEGORY',
        entity_id: id,
        metadata: { name: validated.name, slug: validated.slug },
      });

      res.status(201).json({
        success: true,
        data: newCategory,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = categorySchema.partial().parse(req.body);
      const updated = await categoryRepository.update(req.params.id, validated);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Kategori tidak ditemukan.' },
        });
        return;
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user!.id,
        action: 'UPDATE_CATEGORY',
        entity_type: 'CATEGORY',
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
      const success = await categoryRepository.softDelete(req.params.id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Kategori tidak ditemukan.' },
        });
        return;
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: req.user!.id,
        action: 'DELETE_CATEGORY',
        entity_type: 'CATEGORY',
        entity_id: req.params.id,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Kategori berhasil dihapus.' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const categoryController = new CategoryController();
