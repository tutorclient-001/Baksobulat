import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { Category } from '../../shared/types.js';

export class CategoryRepository {
  async listAll(includeDeleted = false): Promise<Category[]> {
    if (isDbPostgres()) {
      const sql = `
        SELECT c.*, 
               COALESCE((SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id AND d.status = 'ACTIVE'), 0)::int as document_count
        FROM categories c
        ${includeDeleted ? '' : 'WHERE c.is_deleted = false'}
        ORDER BY c.name ASC
      `;
      const res = await query<Category>(sql);
      return res.rows;
    }

    return memoryStore.categories
      .filter((c) => includeDeleted || !c.is_deleted)
      .map((c) => {
        const docCount = memoryStore.documents.filter(
          (d) => d.category_id === c.id && d.status === 'ACTIVE'
        ).length;
        return {
          ...c,
          document_count: docCount,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<Category | null> {
    if (isDbPostgres()) {
      const res = await query<Category>('SELECT * FROM categories WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.categories.find((c) => c.id === id) || null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    if (isDbPostgres()) {
      const res = await query<Category>('SELECT * FROM categories WHERE slug = $1', [slug]);
      return res.rows[0] || null;
    }
    return memoryStore.categories.find((c) => c.slug === slug) || null;
  }

  async create(data: { id: string; name: string; slug: string; description: string }): Promise<Category> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query<Category>(
        `INSERT INTO categories (id, name, slug, description, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, NOW(), NOW())
         RETURNING *`,
        [data.id, data.name, data.slug, data.description]
      );
      return res.rows[0];
    }

    const newCat: Category = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      is_deleted: false,
      document_count: 0,
      created_at: now,
      updated_at: now,
    };
    memoryStore.categories.push(newCat);
    return newCat;
  }

  async update(id: string, data: Partial<{ name: string; slug: string; description: string }>): Promise<Category | null> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;

      if (data.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(data.name);
      }
      if (data.slug !== undefined) {
        sets.push(`slug = $${idx++}`);
        vals.push(data.slug);
      }
      if (data.description !== undefined) {
        sets.push(`description = $${idx++}`);
        vals.push(data.description);
      }

      const res = await query<Category>(
        `UPDATE categories SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }

    const cat = memoryStore.categories.find((c) => c.id === id);
    if (!cat) return null;
    if (data.name !== undefined) cat.name = data.name;
    if (data.slug !== undefined) cat.slug = data.slug;
    if (data.description !== undefined) cat.description = data.description;
    cat.updated_at = now;
    return cat;
  }

  async softDelete(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('UPDATE categories SET is_deleted = true, updated_at = NOW() WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const cat = memoryStore.categories.find((c) => c.id === id);
    if (cat) {
      cat.is_deleted = true;
      cat.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }
}

export const categoryRepository = new CategoryRepository();
