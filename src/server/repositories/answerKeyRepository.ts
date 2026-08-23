import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { AnswerKey, AnswerKeyItem } from '../../shared/types.js';

export class AnswerKeyRepository {
  async findByDocumentId(documentId: string): Promise<AnswerKey | null> {
    if (isDbPostgres()) {
      const res = await query<any>(
        'SELECT * FROM answer_keys WHERE document_id = $1',
        [documentId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        document_id: row.document_id,
        total_questions: row.total_questions,
        passing_score: Number(row.passing_score || 75),
        max_score: Number(row.max_score || 100),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        created_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }

    const ak = memoryStore.answerKeys.find((a) => a.document_id === documentId);
    return ak || null;
  }

  async upsert(data: {
    id: string;
    document_id: string;
    total_questions: number;
    passing_score?: number;
    max_score?: number;
    items: AnswerKeyItem[];
    updated_by: string;
  }): Promise<AnswerKey> {
    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(data.items);
    const passingScore = data.passing_score ?? 75;
    const maxScore = data.max_score ?? 100;

    if (isDbPostgres()) {
      const res = await query<any>(
        `INSERT INTO answer_keys (id, document_id, total_questions, passing_score, max_score, items, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW(), NOW())
         ON CONFLICT (document_id) DO UPDATE SET
           total_questions = EXCLUDED.total_questions,
           passing_score = EXCLUDED.passing_score,
           max_score = EXCLUDED.max_score,
           items = EXCLUDED.items,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
         RETURNING *`,
        [data.id, data.document_id, data.total_questions, passingScore, maxScore, itemsJson, data.updated_by]
      );
      const row = res.rows[0];
      return {
        id: row.id,
        document_id: row.document_id,
        total_questions: row.total_questions,
        passing_score: Number(row.passing_score),
        max_score: Number(row.max_score),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        created_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    }

    const existingIndex = memoryStore.answerKeys.findIndex((a) => a.document_id === data.document_id);
    const newRecord: AnswerKey = {
      id: existingIndex >= 0 ? memoryStore.answerKeys[existingIndex].id : data.id,
      document_id: data.document_id,
      total_questions: data.total_questions,
      passing_score: passingScore,
      max_score: maxScore,
      items: data.items,
      created_by: data.updated_by,
      created_at: existingIndex >= 0 ? memoryStore.answerKeys[existingIndex].created_at : now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      memoryStore.answerKeys[existingIndex] = newRecord;
    } else {
      memoryStore.answerKeys.push(newRecord);
    }

    return newRecord;
  }

  async deleteByDocumentId(documentId: string): Promise<boolean> {
    if (isDbPostgres()) {
      const res = await query('DELETE FROM answer_keys WHERE document_id = $1', [documentId]);
      return (res.rowCount || 0) > 0;
    }
    const idx = memoryStore.answerKeys.findIndex((a) => a.document_id === documentId);
    if (idx >= 0) {
      memoryStore.answerKeys.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const answerKeyRepository = new AnswerKeyRepository();
