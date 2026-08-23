import { query, isDbPostgres, memoryStore } from '../config/database.js';
import {
  DocumentRecord,
  DocumentStatus,
  DocumentFile,
  DocumentFilterParams,
  Pagination,
} from '../../shared/types.js';

export class DocumentRepository {
  async generateDocumentCode(year = new Date().getFullYear()): Promise<string> {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestampSec = Math.floor(Date.now() / 1000).toString().slice(-4);
    return `BS-${year}-${timestampSec}${randomHex}`;
  }

  async findById(id: string, includeFiles = true): Promise<DocumentRecord | null> {
    if (isDbPostgres()) {
      const docSql = `
        SELECT d.*, 
               c.name as category_name,
               u.name as created_by_name,
               (CASE WHEN ak.id IS NOT NULL THEN true ELSE false END) as has_answer_key,
               ak.items as ak_items,
               ak.total_questions as ak_total,
               ak.max_score as ak_max_score
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN answer_keys ak ON d.id = ak.document_id
        WHERE d.id = $1
      `;
      const res = await query(docSql, [id]);
      if (res.rows.length === 0) return null;

      const row = res.rows[0];
      let files: DocumentFile[] = [];

      if (includeFiles) {
        const filesRes = await query<DocumentFile>(
          'SELECT id, document_id, google_drive_file_id, google_drive_folder_id, original_filename, mime_type, file_size, file_hash, file_type, created_at FROM document_files WHERE document_id = $1 ORDER BY created_at ASC',
          [id]
        );
        files = filesRes.rows;
      }

      let akSummary = null;
      if (row.has_answer_key && row.ak_items) {
        const items = typeof row.ak_items === 'string' ? JSON.parse(row.ak_items) : row.ak_items;
        akSummary = {
          total_questions: row.ak_total || items.length,
          pg_count: items.filter((i: any) => i.type === 'PG').length,
          pgk_count: items.filter((i: any) => i.type === 'PGK').length,
          tf_count: items.filter((i: any) => i.type === 'TF').length,
          essay_count: items.filter((i: any) => i.type === 'ESSAY').length,
          max_score: Number(row.ak_max_score || 100),
        };
      }

      return {
        id: row.id,
        document_code: row.document_code,
        title: row.title,
        description: row.description,
        category_id: row.category_id,
        category_name: row.category_name,
        level_id: row.level_id,
        level_name: row.level_name,
        academic_year: row.academic_year,
        semester: row.semester,
        subject: row.subject,
        grade: row.grade,
        tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
        question_count: row.question_count,
        status: row.status,
        has_answer_key: row.has_answer_key,
        answer_key_summary: akSummary,
        files,
        created_by: row.created_by,
        created_by_name: row.created_by_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      };
    }

    // Memory Store
    const doc = memoryStore.documents.find((d) => d.id === id);
    if (!doc) return null;

    const category = memoryStore.categories.find((c) => c.id === doc.category_id);
    const user = memoryStore.users.find((u) => u.id === doc.created_by);
    const ak = memoryStore.answerKeys.find((a) => a.document_id === doc.id);
    const files = includeFiles
      ? memoryStore.documentFiles.filter((f) => f.document_id === doc.id)
      : [];

    let akSummary = null;
    if (ak && ak.items) {
      akSummary = {
        total_questions: ak.total_questions || ak.items.length,
        pg_count: ak.items.filter((i: any) => i.type === 'PG').length,
        pgk_count: ak.items.filter((i: any) => i.type === 'PGK').length,
        tf_count: ak.items.filter((i: any) => i.type === 'TF').length,
        essay_count: ak.items.filter((i: any) => i.type === 'ESSAY').length,
        max_score: ak.max_score || 100,
      };
    }

    return {
      ...doc,
      category_name: category ? category.name : undefined,
      created_by_name: user ? user.name : undefined,
      has_answer_key: !!ak,
      answer_key_summary: akSummary,
      files,
    };
  }

  async list(filters: DocumentFilterParams): Promise<{ data: DocumentRecord[]; pagination: Pagination }> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const status = filters.status || 'ACTIVE';
    const sortField = ['title', 'document_code', 'created_at', 'subject', 'grade'].includes(filters.sort || '')
      ? filters.sort!
      : 'created_at';
    const sortOrder = filters.order === 'ASC' ? 'ASC' : 'DESC';

    if (isDbPostgres()) {
      const conditions: string[] = ['d.status = $1'];
      const params: any[] = [status];
      let pIdx = 2;

      if (filters.categoryId) {
        conditions.push(`d.category_id = $${pIdx++}`);
        params.push(filters.categoryId);
      }
      if (filters.academicYear) {
        conditions.push(`d.academic_year = $${pIdx++}`);
        params.push(filters.academicYear);
      }
      if (filters.semester && filters.semester !== 'ALL') {
        conditions.push(`d.semester = $${pIdx++}`);
        params.push(filters.semester);
      }
      if (filters.subject) {
        conditions.push(`LOWER(d.subject) = LOWER($${pIdx++})`);
        params.push(filters.subject);
      }
      if (filters.grade) {
        conditions.push(`d.grade = $${pIdx++}`);
        params.push(filters.grade);
      }
      if (filters.hasAnswerKey === 'yes') {
        conditions.push(`ak.id IS NOT NULL`);
      } else if (filters.hasAnswerKey === 'no') {
        conditions.push(`ak.id IS NULL`);
      }
      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
        conditions.push(
          `(LOWER(d.title) LIKE $${pIdx} OR LOWER(d.document_code) LIKE $${pIdx} OR LOWER(d.description) LIKE $${pIdx} OR LOWER(d.subject) LIKE $${pIdx} OR LOWER(d.academic_year) LIKE $${pIdx})`
        );
        params.push(searchTerm);
        pIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Total count query
      const countSql = `
        SELECT COUNT(DISTINCT d.id) as total
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN answer_keys ak ON d.id = ak.document_id
        WHERE ${whereClause}
      `;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Data query
      const dataSql = `
        SELECT d.*, 
               c.name as category_name,
               u.name as created_by_name,
               (CASE WHEN ak.id IS NOT NULL THEN true ELSE false END) as has_answer_key,
               ak.items as ak_items,
               ak.total_questions as ak_total,
               ak.max_score as ak_max_score
        FROM documents d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN answer_keys ak ON d.id = ak.document_id
        WHERE ${whereClause}
        ORDER BY d.${sortField} ${sortOrder}
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(limit, offset);

      const dataRes = await query(dataSql, params);

      // Get files for documents
      const docIds = dataRes.rows.map((r) => r.id);
      let filesMap: Record<string, DocumentFile[]> = {};

      if (docIds.length > 0) {
        const filesRes = await query<DocumentFile>(
          'SELECT id, document_id, google_drive_file_id, google_drive_folder_id, original_filename, mime_type, file_size, file_hash, file_type, created_at FROM document_files WHERE document_id = ANY($1)',
          [docIds]
        );
        for (const file of filesRes.rows) {
          if (!filesMap[file.document_id]) filesMap[file.document_id] = [];
          filesMap[file.document_id].push(file);
        }
      }

      const documents: DocumentRecord[] = dataRes.rows.map((row) => {
        let akSummary = null;
        if (row.has_answer_key && row.ak_items) {
          const items = typeof row.ak_items === 'string' ? JSON.parse(row.ak_items) : row.ak_items;
          akSummary = {
            total_questions: row.ak_total || items.length,
            pg_count: items.filter((i: any) => i.type === 'PG').length,
            pgk_count: items.filter((i: any) => i.type === 'PGK').length,
            tf_count: items.filter((i: any) => i.type === 'TF').length,
            essay_count: items.filter((i: any) => i.type === 'ESSAY').length,
            max_score: Number(row.ak_max_score || 100),
          };
        }

        return {
          id: row.id,
          document_code: row.document_code,
          title: row.title,
          description: row.description,
          category_id: row.category_id,
          category_name: row.category_name,
          level_id: row.level_id,
          level_name: row.level_name,
          academic_year: row.academic_year,
          semester: row.semester,
          subject: row.subject,
          grade: row.grade,
          tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []),
          question_count: row.question_count,
          status: row.status,
          has_answer_key: row.has_answer_key,
          answer_key_summary: akSummary,
          files: filesMap[row.id] || [],
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          deleted_at: row.deleted_at,
        };
      });

      return {
        data: documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Memory Store filtering
    let list = memoryStore.documents.filter((d) => d.status === status);

    if (filters.categoryId) {
      list = list.filter((d) => d.category_id === filters.categoryId);
    }
    if ((filters as any).levelId) {
      list = list.filter((d) => d.level_id === (filters as any).levelId);
    }
    if (filters.academicYear) {
      list = list.filter((d) => d.academic_year === filters.academicYear);
    }
    if (filters.semester && filters.semester !== 'ALL') {
      list = list.filter((d) => d.semester === filters.semester);
    }
    if (filters.subject) {
      list = list.filter((d) => d.subject.toLowerCase() === filters.subject!.toLowerCase());
    }
    if (filters.grade) {
      list = list.filter((d) => d.grade === filters.grade);
    }
    if (filters.hasAnswerKey) {
      if (filters.hasAnswerKey === 'yes') {
        list = list.filter((d) => memoryStore.answerKeys.some((a) => a.document_id === d.id));
      } else if (filters.hasAnswerKey === 'no') {
        list = list.filter((d) => !memoryStore.answerKeys.some((a) => a.document_id === d.id));
      }
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.document_code.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          d.subject.toLowerCase().includes(q) ||
          d.grade.toLowerCase().includes(q) ||
          (d.level_name && d.level_name.toLowerCase().includes(q)) ||
          (d.tags && d.tags.some((t: string) => t.toLowerCase().includes(q))) ||
          d.academic_year.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let aVal = (a as any)[sortField] || '';
      let bVal = (b as any)[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'ASC' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const paged = list.slice(offset, offset + limit);

    const data: DocumentRecord[] = paged.map((doc) => {
      const category = memoryStore.categories.find((c) => c.id === doc.category_id);
      const user = memoryStore.users.find((u) => u.id === doc.created_by);
      const ak = memoryStore.answerKeys.find((a) => a.document_id === doc.id);
      const files = memoryStore.documentFiles.filter((f) => f.document_id === doc.id);

      let akSummary = null;
      if (ak && ak.items) {
        akSummary = {
          total_questions: ak.total_questions || ak.items.length,
          pg_count: ak.items.filter((i: any) => i.type === 'PG').length,
          pgk_count: ak.items.filter((i: any) => i.type === 'PGK').length,
          tf_count: ak.items.filter((i: any) => i.type === 'TF').length,
          essay_count: ak.items.filter((i: any) => i.type === 'ESSAY').length,
          max_score: ak.max_score || 100,
        };
      }

      return {
        ...doc,
        category_name: category ? category.name : undefined,
        created_by_name: user ? user.name : undefined,
        has_answer_key: !!ak,
        answer_key_summary: akSummary,
        files,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(data: {
    id: string;
    document_code: string;
    title: string;
    description: string;
    category_id: string;
    level_id?: string;
    level_name?: string;
    academic_year: string;
    semester: 'GANJIL' | 'GENAP' | 'ALL';
    subject: string;
    grade: string;
    tags?: string[];
    question_count: number;
    created_by: string;
  }): Promise<DocumentRecord> {
    const now = new Date().toISOString();

    if (isDbPostgres()) {
      const res = await query<DocumentRecord>(
        `INSERT INTO documents 
         (id, document_code, title, description, category_id, level_id, level_name, academic_year, semester, subject, grade, tags, question_count, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'ACTIVE', $14, NOW(), NOW())
         RETURNING *`,
        [
          data.id,
          data.document_code,
          data.title,
          data.description,
          data.category_id,
          data.level_id || null,
          data.level_name || null,
          data.academic_year,
          data.semester,
          data.subject,
          data.grade,
          JSON.stringify(data.tags || []),
          data.question_count,
          data.created_by,
        ]
      );
      return res.rows[0];
    }

    const newDoc: DocumentRecord = {
      id: data.id,
      document_code: data.document_code,
      title: data.title,
      description: data.description,
      category_id: data.category_id,
      level_id: data.level_id,
      level_name: data.level_name,
      academic_year: data.academic_year,
      semester: data.semester,
      subject: data.subject,
      grade: data.grade,
      tags: data.tags || [],
      question_count: data.question_count,
      status: 'ACTIVE',
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      files: [],
    };
    memoryStore.documents.unshift(newDoc);
    return newDoc;
  }

  async update(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      category_id: string;
      level_id: string;
      level_name: string;
      academic_year: string;
      semester: 'GANJIL' | 'GENAP' | 'ALL';
      subject: string;
      grade: string;
      tags: string[];
      question_count: number;
    }>
  ): Promise<DocumentRecord | null> {
    const now = new Date().toISOString();

    if (isDbPostgres()) {
      const sets: string[] = ['updated_at = NOW()'];
      const vals: any[] = [id];
      let idx = 2;

      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) {
          if (k === 'tags') {
            sets.push(`tags = $${idx++}`);
            vals.push(JSON.stringify(v));
          } else {
            sets.push(`${k} = $${idx++}`);
            vals.push(v);
          }
        }
      }

      const res = await query<DocumentRecord>(
        `UPDATE documents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      return res.rows[0] || null;
    }

    const doc = memoryStore.documents.find((d) => d.id === id);
    if (!doc) return null;
    Object.assign(doc, updates, { updated_at: now });
    return doc;
  }

  async moveToTrash(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query(
        `UPDATE documents SET status = 'TRASHED', deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return (res.rowCount || 0) > 0;
    }
    const doc = memoryStore.documents.find((d) => d.id === id);
    if (doc) {
      doc.status = 'TRASHED';
      doc.deleted_at = now;
      doc.updated_at = now;
      return true;
    }
    return false;
  }

  async restore(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isDbPostgres()) {
      const res = await query(
        `UPDATE documents SET status = 'ACTIVE', deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return (res.rowCount || 0) > 0;
    }
    const doc = memoryStore.documents.find((d) => d.id === id);
    if (doc) {
      doc.status = 'ACTIVE';
      doc.deleted_at = null;
      doc.updated_at = now;
      return true;
    }
    return false;
  }

  async permanentDelete(id: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query(`DELETE FROM documents WHERE id = $1`, [id]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.documents.findIndex((d) => d.id === id);
    if (idx >= 0) {
      memoryStore.documents.splice(idx, 1);
      // Clean up files and answer key
      memoryStore.documentFiles = memoryStore.documentFiles.filter((f) => f.document_id !== id);
      memoryStore.answerKeys = memoryStore.answerKeys.filter((a) => a.document_id !== id);
      return true;
    }
    return false;
  }

  // Document Files management
  async addFile(file: DocumentFile): Promise<DocumentFile> {
    if (isDbPostgres()) {
      const res = await query<DocumentFile>(
        `INSERT INTO document_files 
         (id, document_id, google_drive_file_id, google_drive_folder_id, original_filename, mime_type, file_size, file_hash, file_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING *`,
        [
          file.id,
          file.document_id,
          file.google_drive_file_id,
          file.google_drive_folder_id || null,
          file.original_filename,
          file.mime_type,
          file.file_size,
          file.file_hash,
          file.file_type,
        ]
      );
      return res.rows[0];
    }

    memoryStore.documentFiles.push(file);
    return file;
  }

  async getFileByType(documentId: string, fileType: 'QUESTION' | 'ANSWER_KEY'): Promise<DocumentFile | null> {
    if (isDbPostgres()) {
      const res = await query<DocumentFile>(
        `SELECT * FROM document_files WHERE document_id = $1 AND file_type = $2 ORDER BY created_at DESC LIMIT 1`,
        [documentId, fileType]
      );
      return res.rows[0] || null;
    }
    return (
      memoryStore.documentFiles.find(
        (f) => f.document_id === documentId && f.file_type === fileType
      ) || null
    );
  }

  async deleteFile(fileId: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query(`DELETE FROM document_files WHERE id = $1`, [fileId]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.documentFiles.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      memoryStore.documentFiles.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const documentRepository = new DocumentRepository();
