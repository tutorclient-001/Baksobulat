import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

interface UploadParams {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folderId?: string;
  customFileId?: string;
}

interface UploadResult {
  fileId: string;
  webContentLink?: string;
  size: number;
}

export interface FallbackMeta {
  title?: string;
  documentCode?: string;
  subject?: string;
  grade?: string;
  academicYear?: string;
  semester?: string;
  fileType?: string;
  filename?: string;
}

// Local persistent cache directory for development fallback
const STORAGE_DIR = path.resolve(process.cwd(), 'data_storage_cache');
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (err) {
    // Ignore in read-only environments
  }
}

// In-memory buffer cache
const localFileStorage = new Map<string, { buffer: Buffer; filename: string; mimeType: string; uploadedAt: Date }>();

export class GoogleDriveService {
  private drive: any = null;
  private isConfigured = false;

  constructor() {
    this.initDrive();
    this.loadPersistedCache();
  }

  private initDrive() {
    const email = config.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    let rawKey = config.GOOGLE_PRIVATE_KEY?.trim();

    if (email && rawKey) {
      try {
        // Handle escaped newlines properly from environment variables
        const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

        const auth = new google.auth.JWT({
          email,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });

        this.drive = google.drive({ version: 'v3', auth });
        this.isConfigured = true;
        console.log('✅ Google Drive Service Account terinisialisasi.');
      } catch (err: any) {
        console.warn('⚠️ Gagal inisialisasi Google Drive Client:', err.message);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
    }
  }

  private loadPersistedCache() {
    try {
      if (fs.existsSync(STORAGE_DIR)) {
        const files = fs.readdirSync(STORAGE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const fileId = file.replace('.json', '');
            const binPath = path.join(STORAGE_DIR, `${fileId}.bin`);
            const metaPath = path.join(STORAGE_DIR, file);

            if (fs.existsSync(binPath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                const buffer = fs.readFileSync(binPath);
                localFileStorage.set(fileId, {
                  buffer,
                  filename: meta.filename || `${fileId}.pdf`,
                  mimeType: meta.mimeType || 'application/pdf',
                  uploadedAt: new Date(meta.uploadedAt || Date.now()),
                });
              } catch {
                // Ignore individual corrupt cache
              }
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  private persistFileLocally(fileId: string, buffer: Buffer, filename: string, mimeType: string) {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(STORAGE_DIR, `${fileId}.bin`), buffer);
      fs.writeFileSync(
        path.join(STORAGE_DIR, `${fileId}.json`),
        JSON.stringify({ fileId, filename, mimeType, uploadedAt: new Date().toISOString() })
      );
    } catch {
      // Ignore if read-only filesystem (e.g. serverless container)
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  public async checkDriveHealth(): Promise<{ healthy: boolean; folderId?: string; error?: string }> {
    if (!this.isConfigured || !this.drive) {
      const isProd = process.env.NODE_ENV === 'production';
      return {
        healthy: !isProd, // In dev mode, healthy true; in prod, healthy false
        error: this.isConfigured
          ? undefined
          : 'Google Drive Service Account belum terkonfigurasi (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY).',
      };
    }

    try {
      const folderId = config.GOOGLE_DRIVE_FOLDER_ID || 'root';
      const res = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
      });
      return { healthy: true, folderId: res.data.id };
    } catch (e: any) {
      return { healthy: false, error: `Google Drive API error: ${e.message}` };
    }
  }

  public async uploadFile(params: UploadParams): Promise<UploadResult> {
    const { buffer, filename, mimeType, folderId, customFileId } = params;

    // 1. Real Google Drive Upload
    if (this.isConfigured && this.drive) {
      try {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const targetFolder = folderId || config.GOOGLE_DRIVE_FOLDER_ID;
        const parents = targetFolder ? [targetFolder] : undefined;

        const response = await this.drive.files.create({
          requestBody: {
            name: filename,
            parents,
          },
          media: {
            mimeType,
            body: stream,
          },
          fields: 'id, name, webContentLink, size',
        });

        const fileId = response.data.id;
        if (!fileId) throw new Error('Google Drive upload returned no file ID');

        // Cache locally for faster preview streaming
        localFileStorage.set(fileId, {
          buffer,
          filename,
          mimeType,
          uploadedAt: new Date(),
        });
        this.persistFileLocally(fileId, buffer, filename, mimeType);

        return {
          fileId,
          webContentLink: response.data.webContentLink || '',
          size: buffer.length,
        };
      } catch (err: any) {
        console.error('❌ Google Drive upload gagal:', err.message);
        if (config.STORAGE_PROVIDER === 'google-drive') {
          throw {
            statusCode: 503,
            code: 'STORAGE_UNAVAILABLE',
            message: `Gagal mengunggah file ke Google Drive: ${err.message}`,
          };
        }
      }
    }

    // 2. Production check: If configured as google-drive but not initialized, throw error
    if (config.STORAGE_PROVIDER === 'google-drive' && process.env.NODE_ENV === 'production') {
      throw {
        statusCode: 503,
        code: 'STORAGE_NOT_CONFIGURED',
        message: 'Layanan Google Drive belum dikonfigurasi pada environment produksi.',
      };
    }

    // 3. Development Fallback
    const mockFileId = customFileId || `gdrive_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localFileStorage.set(mockFileId, {
      buffer,
      filename,
      mimeType,
      uploadedAt: new Date(),
    });
    this.persistFileLocally(mockFileId, buffer, filename, mimeType);

    return {
      fileId: mockFileId,
      webContentLink: '',
      size: buffer.length,
    };
  }

  public async getFileStream(
    fileId: string,
    fallbackMeta?: FallbackMeta
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string; mimeType: string; size: number }> {
    // 1. Check in-memory cache
    let cached = localFileStorage.get(fileId);

    // 2. Check disk cache
    if (!cached) {
      const binPath = path.join(STORAGE_DIR, `${fileId}.bin`);
      const metaPath = path.join(STORAGE_DIR, `${fileId}.json`);
      if (fs.existsSync(binPath)) {
        try {
          const buffer = fs.readFileSync(binPath);
          let filename = fallbackMeta?.filename || `${fileId}.pdf`;
          let mimeType = 'application/pdf';
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            filename = meta.filename || filename;
            mimeType = meta.mimeType || mimeType;
          }
          cached = { buffer, filename, mimeType, uploadedAt: new Date() };
          localFileStorage.set(fileId, cached);
        } catch {
          // ignore
        }
      }
    }

    if (cached) {
      const stream = new Readable();
      stream.push(cached.buffer);
      stream.push(null);
      return {
        stream,
        filename: cached.filename,
        mimeType: cached.mimeType,
        size: cached.buffer.length,
      };
    }

    // 3. Try Google Drive
    if (this.isConfigured && this.drive && !fileId.startsWith('gdrive_local_')) {
      try {
        const metaRes = await this.drive.files.get({
          fileId,
          fields: 'id, name, mimeType, size',
        });

        const streamRes = await this.drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        return {
          stream: streamRes.data,
          filename: metaRes.data.name || fallbackMeta?.filename || 'dokumen.pdf',
          mimeType: metaRes.data.mimeType || 'application/pdf',
          size: metaRes.data.size ? parseInt(metaRes.data.size, 10) : 0,
        };
      } catch (err: any) {
        console.warn(`Google Drive fetch gagal untuk ${fileId}:`, err.message);
        if (config.STORAGE_PROVIDER === 'google-drive' && process.env.NODE_ENV === 'production') {
          throw {
            statusCode: 404,
            code: 'FILE_NOT_FOUND',
            message: `File tidak ditemukan di Google Drive: ${err.message}`,
          };
        }
      }
    }

    throw {
      statusCode: 404,
      code: 'FILE_NOT_FOUND',
      message: 'Berkas PDF tidak ditemukan pada media penyimpanan.',
    };
  }

  public async deleteFile(fileId: string): Promise<void> {
    localFileStorage.delete(fileId);

    try {
      const binPath = path.join(STORAGE_DIR, `${fileId}.bin`);
      const metaPath = path.join(STORAGE_DIR, `${fileId}.json`);
      if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    } catch {
      // ignore
    }

    if (this.isConfigured && this.drive && !fileId.startsWith('gdrive_local_')) {
      try {
        await this.drive.files.delete({ fileId });
      } catch (err: any) {
        console.warn(`Could not delete file ${fileId} from Google Drive:`, err.message);
      }
    }
  }

  public async checkFileExists(fileId: string): Promise<boolean> {
    if (localFileStorage.has(fileId)) return true;
    if (fs.existsSync(path.join(STORAGE_DIR, `${fileId}.bin`))) return true;

    if (this.isConfigured && this.drive && !fileId.startsWith('gdrive_local_')) {
      try {
        await this.drive.files.get({ fileId, fields: 'id' });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const googleDriveService = new GoogleDriveService();
