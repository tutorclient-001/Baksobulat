import { query, isDbPostgres, memoryStore } from '../config/database.js';
import { googleDriveService } from './googleDriveService.js';
import { DocumentFile } from '../../shared/types.js';

export interface ReconciliationReport {
  totalDatabaseFiles: number;
  validFilesCount: number;
  missingFromStorageCount: number;
  details: {
    fileId: string;
    documentId: string;
    originalFilename: string;
    googleDriveFileId: string;
    status: 'EXISTS' | 'MISSING_IN_STORAGE';
  }[];
}

export class ReconciliationService {
  async reconcile(): Promise<ReconciliationReport> {
    let files: DocumentFile[] = [];

    if (isDbPostgres()) {
      const res = await query<DocumentFile>('SELECT * FROM document_files ORDER BY created_at DESC');
      files = res.rows;
    } else {
      files = [...memoryStore.documentFiles];
    }

    const details: ReconciliationReport['details'] = [];
    let missingCount = 0;
    let validCount = 0;

    for (const f of files) {
      const exists = await googleDriveService.checkFileExists(f.google_drive_file_id);
      if (exists) {
        validCount++;
        details.push({
          fileId: f.id,
          documentId: f.document_id,
          originalFilename: f.original_filename,
          googleDriveFileId: f.google_drive_file_id,
          status: 'EXISTS',
        });
      } else {
        missingCount++;
        details.push({
          fileId: f.id,
          documentId: f.document_id,
          originalFilename: f.original_filename,
          googleDriveFileId: f.google_drive_file_id,
          status: 'MISSING_IN_STORAGE',
        });
      }
    }

    return {
      totalDatabaseFiles: files.length,
      validFilesCount: validCount,
      missingFromStorageCount: missingCount,
      details,
    };
  }
}

export const reconciliationService = new ReconciliationService();
