import { answerKeyRepository } from '../repositories/answerKeyRepository.js';
import { documentRepository } from '../repositories/documentRepository.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { AnswerKey, AnswerKeyItem } from '../../shared/types.js';

export class AnswerKeyService {
  async getByDocumentId(documentId: string): Promise<AnswerKey | null> {
    return answerKeyRepository.findByDocumentId(documentId);
  }

  async saveAnswerKey(
    documentId: string,
    items: AnswerKeyItem[],
    passingScore = 75,
    userId: string
  ): Promise<AnswerKey> {
    const doc = await documentRepository.findById(documentId);
    if (!doc) {
      throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };
    }

    // Sanitize and validate items
    const sanitizedItems: AnswerKeyItem[] = items.map((item, idx) => ({
      number: item.number || idx + 1,
      type: item.type || 'PG',
      optionsCount: item.optionsCount || (item.type === 'TF' ? 2 : 5),
      correctAnswers: Array.isArray(item.correctAnswers) ? item.correctAnswers : [],
      essayKeywords: Array.isArray(item.essayKeywords) ? item.essayKeywords : [],
      essayRubric: item.essayRubric || '',
      weight: Number(item.weight) > 0 ? Number(item.weight) : 1,
      explanation: item.explanation || '',
    }));

    const totalQuestions = sanitizedItems.length;
    const maxScore = sanitizedItems.reduce((acc, curr) => acc + curr.weight, 0);

    const keyId = `ak_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await answerKeyRepository.upsert({
      id: keyId,
      document_id: documentId,
      total_questions: totalQuestions,
      passing_score: passingScore,
      max_score: maxScore,
      items: sanitizedItems,
      updated_by: userId,
    });

    // Also sync document's question_count if needed
    if (doc.question_count !== totalQuestions) {
      await documentRepository.update(documentId, { question_count: totalQuestions });
    }

    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'UPDATE_ANSWER_KEY',
      entity_type: 'ANSWER_KEY',
      entity_id: documentId,
      metadata: {
        total_questions: totalQuestions,
        max_score: maxScore,
        pg_count: sanitizedItems.filter((i) => i.type === 'PG').length,
        pgk_count: sanitizedItems.filter((i) => i.type === 'PGK').length,
        tf_count: sanitizedItems.filter((i) => i.type === 'TF').length,
        essay_count: sanitizedItems.filter((i) => i.type === 'ESSAY').length,
      },
    });

    return saved;
  }

  async deleteAnswerKey(documentId: string, userId: string): Promise<void> {
    const doc = await documentRepository.findById(documentId);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    await answerKeyRepository.deleteByDocumentId(documentId);
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'DELETE_ANSWER_KEY',
      entity_type: 'ANSWER_KEY',
      entity_id: documentId,
    });
  }
}

export const answerKeyService = new AnswerKeyService();
