import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { EducationLevel, GradeLevel, SubjectItem, SearchTag } from '../../shared/types.js';

export class MasterDataRepository {
  // ==========================================
  // 1. EDUCATION LEVELS (JENJANG)
  // ==========================================
  async listEducationLevels(): Promise<EducationLevel[]> {
    if (isDbPostgres()) {
      const res = await query<EducationLevel>(
        'SELECT * FROM education_levels ORDER BY order_index ASC, name ASC'
      );
      return res.rows;
    }
    return [...memoryStore.educationLevels].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  }

  async findEducationLevelById(id: string): Promise<EducationLevel | null> {
    if (isDbPostgres()) {
      const res = await query<EducationLevel>(
        'SELECT * FROM education_levels WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    }
    return memoryStore.educationLevels.find((l) => l.id === id) || null;
  }

  async createEducationLevel(data: {
    id: string;
    name: string;
    code: string;
    description?: string;
    order_index?: number;
  }): Promise<EducationLevel> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query<EducationLevel>(
        `INSERT INTO education_levels (id, name, code, description, order_index, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [data.id, data.name, data.code, data.description || '', data.order_index ?? 0]
      );
      return res.rows[0];
    }
    const item: EducationLevel = {
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description || '',
      order_index: data.order_index ?? 0,
      created_at: now,
      updated_at: now,
    };
    memoryStore.educationLevels.push(item);
    return item;
  }

  async updateEducationLevel(
    id: string,
    data: Partial<{ name: string; code: string; description: string; order_index: number }>
  ): Promise<EducationLevel | null> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;
      if (data.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(data.name);
      }
      if (data.code !== undefined) {
        sets.push(`code = $${idx++}`);
        vals.push(data.code);
      }
      if (data.description !== undefined) {
        sets.push(`description = $${idx++}`);
        vals.push(data.description);
      }
      if (data.order_index !== undefined) {
        sets.push(`order_index = $${idx++}`);
        vals.push(data.order_index);
      }
      const res = await query<EducationLevel>(
        `UPDATE education_levels SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }
    const item = memoryStore.educationLevels.find((l) => l.id === id);
    if (!item) return null;
    if (data.name !== undefined) item.name = data.name;
    if (data.code !== undefined) item.code = data.code;
    if (data.description !== undefined) item.description = data.description;
    if (data.order_index !== undefined) item.order_index = data.order_index;
    item.updated_at = now;
    return item;
  }

  async deleteEducationLevel(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM education_levels WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.educationLevels.findIndex((l) => l.id === id);
    if (idx !== -1) {
      memoryStore.educationLevels.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ==========================================
  // 2. GRADE LEVELS (KELAS)
  // ==========================================
  async listGradeLevels(levelId?: string): Promise<GradeLevel[]> {
    if (isDbPostgres()) {
      let sql = `
        SELECT g.*, l.name as level_name
        FROM grade_levels g
        LEFT JOIN education_levels l ON g.level_id = l.id
      `;
      const params: any[] = [];
      if (levelId) {
        sql += ' WHERE g.level_id = $1';
        params.push(levelId);
      }
      sql += ' ORDER BY g.order_index ASC, g.name ASC';
      const res = await query<GradeLevel>(sql, params);
      return res.rows;
    }
    let list = memoryStore.gradeLevels;
    if (levelId) {
      list = list.filter((g) => g.level_id === levelId);
    }
    return list
      .map((g) => {
        const lvl = memoryStore.educationLevels.find((l) => l.id === g.level_id);
        return { ...g, level_name: lvl ? lvl.name : g.level_name };
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  async findGradeLevelById(id: string): Promise<GradeLevel | null> {
    if (isDbPostgres()) {
      const res = await query<GradeLevel>(
        `SELECT g.*, l.name as level_name
         FROM grade_levels g
         LEFT JOIN education_levels l ON g.level_id = l.id
         WHERE g.id = $1`,
        [id]
      );
      return res.rows[0] || null;
    }
    const item = memoryStore.gradeLevels.find((g) => g.id === id);
    if (!item) return null;
    const lvl = memoryStore.educationLevels.find((l) => l.id === item.level_id);
    return { ...item, level_name: lvl ? lvl.name : item.level_name };
  }

  async createGradeLevel(data: {
    id: string;
    level_id?: string;
    level_name?: string;
    name: string;
    code: string;
    order_index?: number;
  }): Promise<GradeLevel> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query<GradeLevel>(
        `INSERT INTO grade_levels (id, level_id, level_name, name, code, order_index, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [
          data.id,
          data.level_id || null,
          data.level_name || null,
          data.name,
          data.code,
          data.order_index ?? 0,
        ]
      );
      return res.rows[0];
    }
    const item: GradeLevel = {
      id: data.id,
      level_id: data.level_id,
      level_name: data.level_name,
      name: data.name,
      code: data.code,
      order_index: data.order_index ?? 0,
      created_at: now,
      updated_at: now,
    };
    memoryStore.gradeLevels.push(item);
    return item;
  }

  async updateGradeLevel(
    id: string,
    data: Partial<{
      level_id: string;
      level_name: string;
      name: string;
      code: string;
      order_index: number;
    }>
  ): Promise<GradeLevel | null> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;
      if (data.level_id !== undefined) {
        sets.push(`level_id = $${idx++}`);
        vals.push(data.level_id);
      }
      if (data.level_name !== undefined) {
        sets.push(`level_name = $${idx++}`);
        vals.push(data.level_name);
      }
      if (data.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(data.name);
      }
      if (data.code !== undefined) {
        sets.push(`code = $${idx++}`);
        vals.push(data.code);
      }
      if (data.order_index !== undefined) {
        sets.push(`order_index = $${idx++}`);
        vals.push(data.order_index);
      }
      const res = await query<GradeLevel>(
        `UPDATE grade_levels SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }
    const item = memoryStore.gradeLevels.find((g) => g.id === id);
    if (!item) return null;
    if (data.level_id !== undefined) item.level_id = data.level_id;
    if (data.level_name !== undefined) item.level_name = data.level_name;
    if (data.name !== undefined) item.name = data.name;
    if (data.code !== undefined) item.code = data.code;
    if (data.order_index !== undefined) item.order_index = data.order_index;
    item.updated_at = now;
    return item;
  }

  async deleteGradeLevel(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM grade_levels WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.gradeLevels.findIndex((g) => g.id === id);
    if (idx !== -1) {
      memoryStore.gradeLevels.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ==========================================
  // 3. SUBJECTS (MATA PELAJARAN)
  // ==========================================
  async listSubjects(category?: string): Promise<SubjectItem[]> {
    if (isDbPostgres()) {
      let sql = 'SELECT * FROM subjects';
      const params: any[] = [];
      if (category) {
        sql += ' WHERE category = $1';
        params.push(category);
      }
      sql += ' ORDER BY name ASC';
      const res = await query<SubjectItem>(sql, params);
      return res.rows;
    }
    let list = memoryStore.subjects;
    if (category) {
      list = list.filter((s) => s.category === category);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findSubjectById(id: string): Promise<SubjectItem | null> {
    if (isDbPostgres()) {
      const res = await query<SubjectItem>('SELECT * FROM subjects WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.subjects.find((s) => s.id === id) || null;
  }

  async createSubject(data: {
    id: string;
    name: string;
    code: string;
    category?: string;
    description?: string;
  }): Promise<SubjectItem> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query<SubjectItem>(
        `INSERT INTO subjects (id, name, code, category, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [data.id, data.name, data.code, data.category || 'Umum', data.description || '']
      );
      return res.rows[0];
    }
    const item: SubjectItem = {
      id: data.id,
      name: data.name,
      code: data.code,
      category: data.category || 'Umum',
      description: data.description || '',
      created_at: now,
      updated_at: now,
    };
    memoryStore.subjects.push(item);
    return item;
  }

  async updateSubject(
    id: string,
    data: Partial<{ name: string; code: string; category: string; description: string }>
  ): Promise<SubjectItem | null> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;
      if (data.name !== undefined) {
        sets.push(`name = $${idx++}`);
        vals.push(data.name);
      }
      if (data.code !== undefined) {
        sets.push(`code = $${idx++}`);
        vals.push(data.code);
      }
      if (data.category !== undefined) {
        sets.push(`category = $${idx++}`);
        vals.push(data.category);
      }
      if (data.description !== undefined) {
        sets.push(`description = $${idx++}`);
        vals.push(data.description);
      }
      const res = await query<SubjectItem>(
        `UPDATE subjects SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }
    const item = memoryStore.subjects.find((s) => s.id === id);
    if (!item) return null;
    if (data.name !== undefined) item.name = data.name;
    if (data.code !== undefined) item.code = data.code;
    if (data.category !== undefined) item.category = data.category;
    if (data.description !== undefined) item.description = data.description;
    item.updated_at = now;
    return item;
  }

  async deleteSubject(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM subjects WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.subjects.findIndex((s) => s.id === id);
    if (idx !== -1) {
      memoryStore.subjects.splice(idx, 1);
      return true;
    }
    return false;
  }

  // ==========================================
  // 4. SEARCH TAGS (TAGS PENCARIAN)
  // ==========================================
  async listSearchTags(): Promise<SearchTag[]> {
    if (isDbPostgres()) {
      const res = await query<SearchTag>(
        'SELECT * FROM search_tags ORDER BY name ASC'
      );
      return res.rows;
    }
    return [...memoryStore.searchTags].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findSearchTagById(id: string): Promise<SearchTag | null> {
    if (isDbPostgres()) {
      const res = await query<SearchTag>('SELECT * FROM search_tags WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.searchTags.find((t) => t.id === id) || null;
  }

  async createSearchTag(data: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    description?: string;
  }): Promise<SearchTag> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query<SearchTag>(
        `INSERT INTO search_tags (id, name, slug, color, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [data.id, data.name, data.slug, data.color || 'indigo', data.description || '']
      );
      return res.rows[0];
    }
    const item: SearchTag = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      color: data.color || 'indigo',
      description: data.description || '',
      created_at: now,
      updated_at: now,
    };
    memoryStore.searchTags.push(item);
    return item;
  }

  async updateSearchTag(
    id: string,
    data: Partial<{ name: string; slug: string; color: string; description: string }>
  ): Promise<SearchTag | null> {
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
      if (data.color !== undefined) {
        sets.push(`color = $${idx++}`);
        vals.push(data.color);
      }
      if (data.description !== undefined) {
        sets.push(`description = $${idx++}`);
        vals.push(data.description);
      }
      const res = await query<SearchTag>(
        `UPDATE search_tags SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }
    const item = memoryStore.searchTags.find((t) => t.id === id);
    if (!item) return null;
    if (data.name !== undefined) item.name = data.name;
    if (data.slug !== undefined) item.slug = data.slug;
    if (data.color !== undefined) item.color = data.color;
    if (data.description !== undefined) item.description = data.description;
    item.updated_at = now;
    return item;
  }

  async deleteSearchTag(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM search_tags WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.searchTags.findIndex((t) => t.id === id);
    if (idx !== -1) {
      memoryStore.searchTags.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const masterDataRepository = new MasterDataRepository();
