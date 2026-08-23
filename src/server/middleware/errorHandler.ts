import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || (err instanceof ZodError ? 400 : 500);

  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`[Client Warn ${statusCode}] ${req.method} ${req.originalUrl}: ${err.message || err.code || 'Validation error'}`);
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data masukan tidak valid.',
        details: err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err.message && err.message.startsWith('INVALID_FILE_TYPE')) {
    res.status(415).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: err.message,
      },
    });
    return;
  }

  if (err.message && err.message.startsWith('INVALID_PDF_SIGNATURE')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PDF_SIGNATURE',
        message: err.message,
      },
    });
    return;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Ukuran file melebihi batas maksimum yang diizinkan sistem.',
      },
    });
    return;
  }

  if (err.message === 'FILE_NOT_FOUND') {
    res.status(404).json({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'File PDF tidak ditemukan di penyimpanan Google Drive.',
      },
    });
    return;
  }

  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Terjadi kesalahan internal pada server.'
      : err.message || 'Terjadi kesalahan sistem.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR'),
      message,
    },
  });
}
