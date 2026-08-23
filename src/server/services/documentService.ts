import { documentRepository } from '../repositories/documentRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { googleDriveService } from './googleDriveService.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { ProcessedPdfFile } from '../middleware/upload.js';
import {
  DocumentRecord,
  DocumentFilterParams,
  Pagination,
  FileType,
} from '../../shared/types.js';

export interface CreateDocumentInput {
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
  userId: string;
  questionPdf: ProcessedPdfFile;
  answerKeyPdf?: ProcessedPdfFile;
}

export class DocumentService {
  async createDocumentWithFiles(input: CreateDocumentInput): Promise<DocumentRecord> {
    // 1. Validate Category
    const category = await categoryRepository.findById(input.category_id);
    if (!category || category.is_deleted) {
      throw { statusCode: 400, code: 'INVALID_CATEGORY', message: 'Kategori tidak valid atau telah dihapus.' };
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docCode = await documentRepository.generateDocumentCode();

    let uploadedDriveFiles: string[] = [];

    try {
      // 2. Upload Question PDF to Google Drive
      const questionUpload = await googleDriveService.uploadFile({
        buffer: input.questionPdf.buffer,
        filename: `${docCode}_Soal_${input.questionPdf.originalFilename}`,
        mimeType: input.questionPdf.mimeType,
      });
      uploadedDriveFiles.push(questionUpload.fileId);

      // 3. Upload Answer Key PDF if provided
      let answerKeyUploadId: string | null = null;
      if (input.answerKeyPdf) {
        const akUpload = await googleDriveService.uploadFile({
          buffer: input.answerKeyPdf.buffer,
          filename: `${docCode}_Kunci_${input.answerKeyPdf.originalFilename}`,
          mimeType: input.answerKeyPdf.mimeType,
        });
        answerKeyUploadId = akUpload.fileId;
        uploadedDriveFiles.push(akUpload.fileId);
      }

      // 4. Save Document Record to Database
      const newDoc = await documentRepository.create({
        id: docId,
        document_code: docCode,
        title: input.title,
        description: input.description,
        category_id: input.category_id,
        level_id: input.level_id,
        level_name: input.level_name,
        academic_year: input.academic_year,
        semester: input.semester,
        subject: input.subject,
        grade: input.grade,
        tags: input.tags,
        question_count: input.question_count || 0,
        created_by: input.userId,
      });

      // 5. Save Question Document File
      const qFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await documentRepository.addFile({
        id: qFileId,
        document_id: docId,
        google_drive_file_id: questionUpload.fileId,
        original_filename: input.questionPdf.originalFilename,
        mime_type: input.questionPdf.mimeType,
        file_size: input.questionPdf.size,
        file_hash: input.questionPdf.hash,
        file_type: 'QUESTION',
        created_at: new Date().toISOString(),
      });

      // 6. Save Answer Key File if provided
      if (input.answerKeyPdf && answerKeyUploadId) {
        const akFileId = `file_${Date.now() + 1}_${Math.random().toString(36).substring(2, 7)}`;
        await documentRepository.addFile({
          id: akFileId,
          document_id: docId,
          google_drive_file_id: answerKeyUploadId,
          original_filename: input.answerKeyPdf.originalFilename,
          mime_type: input.answerKeyPdf.mimeType,
          file_size: input.answerKeyPdf.size,
          file_hash: input.answerKeyPdf.hash,
          file_type: 'ANSWER_KEY',
          created_at: new Date().toISOString(),
        });
      }

      // 7. Audit Log
      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: input.userId,
        action: 'CREATE_DOCUMENT',
        entity_type: 'DOCUMENT',
        entity_id: docId,
        metadata: {
          document_code: docCode,
          title: input.title,
          file_size: input.questionPdf.size,
          has_answer_key_pdf: !!input.answerKeyPdf,
        },
      });

      const fullDoc = await documentRepository.findById(docId);
      return fullDoc || newDoc;
    } catch (err: any) {
      // Compensating cleanup: Delete any files that reached Google Drive
      for (const fileId of uploadedDriveFiles) {
        try {
          await googleDriveService.deleteFile(fileId);
        } catch (cleanupErr: any) {
          console.warn(`Compensation cleanup failed for file ${fileId}:`, cleanupErr.message);
        }
      }
      throw err;
    }
  }

  async listDocuments(filters: DocumentFilterParams): Promise<{ data: DocumentRecord[]; pagination: Pagination }> {
    return documentRepository.list(filters);
  }

  async getDocumentById(id: string): Promise<DocumentRecord> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen bank soal tidak ditemukan.' };
    }
    return doc;
  }

  async updateDocument(
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
    }>,
    userId: string
  ): Promise<DocumentRecord> {
    const existing = await documentRepository.findById(id);
    if (!existing) {
      throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };
    }

    if (updates.category_id) {
      const cat = await categoryRepository.findById(updates.category_id);
      if (!cat) throw { statusCode: 400, code: 'INVALID_CATEGORY', message: 'Kategori tidak valid.' };
    }

    const updated = await documentRepository.update(id, updates);
    if (!updated) {
      throw { statusCode: 500, code: 'UPDATE_FAILED', message: 'Gagal memperbarui metadata dokumen.' };
    }

    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'UPDATE_DOCUMENT',
      entity_type: 'DOCUMENT',
      entity_id: id,
      metadata: { updates },
    });

    const full = await documentRepository.findById(id);
    return full || updated;
  }

  async replaceFile(
    documentId: string,
    fileType: FileType,
    newFile: ProcessedPdfFile,
    userId: string
  ): Promise<void> {
    const doc = await documentRepository.findById(documentId);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    const oldFile = await documentRepository.getFileByType(documentId, fileType);

    // 1. Upload new file to Drive first
    const uploadResult = await googleDriveService.uploadFile({
      buffer: newFile.buffer,
      filename: `${doc.document_code}_${fileType}_${newFile.originalFilename}`,
      mimeType: newFile.mimeType,
    });

    try {
      // 2. Add new DB file record
      const newFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await documentRepository.addFile({
        id: newFileId,
        document_id: documentId,
        google_drive_file_id: uploadResult.fileId,
        original_filename: newFile.originalFilename,
        mime_type: newFile.mimeType,
        file_size: newFile.size,
        file_hash: newFile.hash,
        file_type: fileType,
        created_at: new Date().toISOString(),
      });

      // 3. If old file existed, delete old DB record and delete from Drive
      if (oldFile) {
        await documentRepository.deleteFile(oldFile.id);
        await googleDriveService.deleteFile(oldFile.google_drive_file_id);
      }

      await auditLogRepository.log({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        action: 'UPLOAD_FILE',
        entity_type: 'DOCUMENT_FILE',
        entity_id: documentId,
        metadata: { file_type: fileType, filename: newFile.originalFilename, size: newFile.size },
      });
    } catch (err: any) {
      // Compensate: Delete newly uploaded file if DB update failed
      await googleDriveService.deleteFile(uploadResult.fileId);
      throw err;
    }
  }

  async moveToTrash(id: string, userId: string): Promise<void> {
    const doc = await documentRepository.findById(id);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    await documentRepository.moveToTrash(id);
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'DELETE_DOCUMENT',
      entity_type: 'DOCUMENT',
      entity_id: id,
      metadata: { document_code: doc.document_code, title: doc.title },
    });
  }

  async restore(id: string, userId: string): Promise<void> {
    const doc = await documentRepository.findById(id);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    // Verify files still exist in storage
    const qFile = await documentRepository.getFileByType(id, 'QUESTION');
    if (qFile) {
      const exists = await googleDriveService.checkFileExists(qFile.google_drive_file_id);
      if (!exists) {
        throw {
          statusCode: 400,
          code: 'STORAGE_FILE_MISSING',
          message: 'File PDF soal sudah tidak ada di penyimpanan Google Drive sehingga dokumen tidak dapat dipulihkan.',
        };
      }
    }

    await documentRepository.restore(id);
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'RESTORE_DOCUMENT',
      entity_type: 'DOCUMENT',
      entity_id: id,
      metadata: { document_code: doc.document_code, title: doc.title },
    });
  }

  async permanentDelete(id: string, userId: string): Promise<void> {
    const doc = await documentRepository.findById(id, true);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    // Delete all linked files from Google Drive
    if (doc.files && doc.files.length > 0) {
      for (const f of doc.files) {
        try {
          await googleDriveService.deleteFile(f.google_drive_file_id);
        } catch (e: any) {
          console.warn(`Could not delete Drive file ${f.google_drive_file_id}:`, e.message);
        }
      }
    }

    await documentRepository.permanentDelete(id);
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      action: 'PERMANENT_DELETE',
      entity_type: 'DOCUMENT',
      entity_id: id,
      metadata: { document_code: doc.document_code, title: doc.title },
    });
  }

  async getFileStream(
    documentId: string,
    fileType: FileType,
    userId?: string,
    action: 'PREVIEW' | 'DOWNLOAD' = 'PREVIEW',
    ipAddress?: string,
    userAgent?: string
  ) {
    const doc = await documentRepository.findById(documentId, true);
    if (!doc) throw { statusCode: 404, code: 'DOCUMENT_NOT_FOUND', message: 'Dokumen tidak ditemukan.' };

    const file = await documentRepository.getFileByType(documentId, fileType);
    if (!file) {
      throw {
        statusCode: 404,
        code: fileType === 'ANSWER_KEY' ? 'ANSWER_KEY_NOT_FOUND' : 'FILE_NOT_FOUND',
        message:
          fileType === 'ANSWER_KEY'
            ? 'Dokumen ini belum memiliki file PDF Kunci Jawaban.'
            : 'File PDF soal tidak ditemukan dalam database dokumen ini.',
      };
    }

    const streamResult = await googleDriveService.getFileStream(file.google_drive_file_id, {
      title: doc.title,
      documentCode: doc.document_code,
      subject: doc.subject,
      grade: doc.grade,
      academicYear: doc.academic_year,
      semester: doc.semester,
      fileType,
      filename: file.original_filename,
    });

    // Audit action
    await auditLogRepository.log({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId || null,
      action: action === 'PREVIEW' ? 'PREVIEW_DOCUMENT' : 'DOWNLOAD_DOCUMENT',
      entity_type: 'DOCUMENT',
      entity_id: documentId,
      metadata: {
        document_code: doc.document_code,
        file_type: fileType,
        filename: file.original_filename,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return {
      stream: streamResult.stream,
      filename: file.original_filename,
      mimeType: file.mime_type,
      size: file.file_size,
    };
  }
}

export const documentService = new DocumentService();
