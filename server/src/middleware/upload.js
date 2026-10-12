/**
 * Document uploads: memory storage (no temp files on disk), strict size limit, one file per request.
 * The client-supplied MIME type is NOT trusted: the file signature is checked in document.service.
 */
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_EXT = /\.(pdf|docx|txt|md|markdown)$/i;

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1, fields: 20, fieldSize: 200 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_EXT.test(file.originalname || '')) return cb(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Unsupported file type. Upload a PDF, DOCX, TXT or Markdown file.'));
    cb(null, true);
  }
}).single('file');
