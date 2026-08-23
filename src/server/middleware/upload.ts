import multer from 'multer';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: (config.MAX_FILE_SIZE_MB || 25) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME check
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Hanya file format PDF yang diperbolehkan.'));
    }
  },
});

export interface ProcessedPdfFile {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  size: number;
  hash: string;
}

export function validatePdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const header = buffer.subarray(0, 5).toString('ascii');
  return header === '%PDF-';
}

export function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function processUploadedPdf(file: Express.Multer.File): ProcessedPdfFile {
  if (!validatePdfMagicBytes(file.buffer)) {
    throw new Error('INVALID_PDF_SIGNATURE: File yang diunggah bukan file PDF valid (Magic bytes header tidak sesuai).');
  }

  const hash = calculateSha256(file.buffer);
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    buffer: file.buffer,
    originalFilename: sanitizedFilename,
    mimeType: 'application/pdf',
    size: file.size,
    hash,
  };
}
