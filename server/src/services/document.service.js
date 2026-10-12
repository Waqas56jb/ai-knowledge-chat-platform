/**
 * Document validation, private storage and text extraction.
 * - File type is decided from the file SIGNATURE + extension, never from the client MIME type.
 * - Originals are stored in a PRIVATE Supabase Storage bucket (prefixed name); downloads use short signed URLs.
 * - Extraction runs in memory (no temp files to clean up).
 */
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { safeFileName } from '../utils/sanitize.js';
import { normalizeText } from './chunking.service.js';
import { logger } from '../utils/logger.js';

const isPdf = b => b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-';
const isZip = b => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
function isUtf8Text(b) {
  if (b.includes(0)) return false;
  try { new TextDecoder('utf-8', { fatal: true }).decode(b); return true; } catch { return false; }
}

/** → 'pdf' | 'docx' | 'txt' | 'markdown'. Throws 415 for anything else or a mismatching signature. */
export function detectDocumentType(buffer, originalName) {
  const ext = (String(originalName).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  const bad = () => new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'The file content does not match a supported type (PDF, DOCX, TXT, Markdown).');
  if (ext === 'pdf') { if (!isPdf(buffer)) throw bad(); return 'pdf'; }
  if (ext === 'docx') { if (!isZip(buffer)) throw bad(); return 'docx'; }
  if (ext === 'txt') { if (!isUtf8Text(buffer)) throw bad(); return 'txt'; }
  if (ext === 'md' || ext === 'markdown') { if (!isUtf8Text(buffer)) throw bad(); return 'markdown'; }
  throw bad();
}

let bucketReady = false;
export async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(env.STORAGE_BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(env.STORAGE_BUCKET, { public: false, fileSizeLimit: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 });
    if (error && !/already exists/i.test(error.message)) throw ApiError.unavailable('Private document storage is not available.');
  } else if (data.public) {
    throw new ApiError(500, 'STORAGE_MISCONFIGURED', `Storage bucket ${env.STORAGE_BUCKET} must be private.`);
  }
  bucketReady = true;
}

const CONTENT_TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain; charset=utf-8', markdown: 'text/markdown; charset=utf-8' };

export async function storeDocument(sourceId, buffer, originalName, type) {
  await ensureBucket();
  const path = `sources/${sourceId}/${safeFileName(originalName)}`;
  const { error } = await supabaseAdmin.storage.from(env.STORAGE_BUCKET).upload(path, buffer, { contentType: CONTENT_TYPES[type], upsert: true });
  if (error) { logger.error({ msg: error.message }, 'storage upload failed'); throw ApiError.unavailable('The file could not be stored.'); }
  return path;
}

export async function downloadDocument(path) {
  const { data, error } = await supabaseAdmin.storage.from(env.STORAGE_BUCKET).download(path);
  if (error || !data) { const e = ApiError.unavailable('The stored file could not be read.'); e.transient = true; throw e; }
  return Buffer.from(await data.arrayBuffer());
}

export async function removeDocument(path) {
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(env.STORAGE_BUCKET).remove([path]);
  if (error) logger.warn({ msg: error.message }, 'storage remove failed');
}

/** Short-lived signed URL for an authorized download. */
export async function signedUrl(path, seconds = 120) {
  const { data, error } = await supabaseAdmin.storage.from(env.STORAGE_BUCKET).createSignedUrl(path, seconds);
  if (error) throw ApiError.unavailable('A download link could not be created.');
  return data.signedUrl;
}

/** → { pages?: [{ page, text }], text, pageCount? } */
export async function extractText(buffer, type) {
  const fail = msg => { const e = ApiError.validation(msg); e.permanent = true; return e; };
  if (type === 'pdf') {
    const pages = [];
    let parsed;
    try {
      // Copy into a fresh, offset-0 array: small Node Buffers live in a shared pool (byteOffset ≠ 0),
      // which the bundled pdf.js mis-reads ("bad XRef entry").
      parsed = await pdfParse(new Uint8Array(buffer), {
        max: env.MAX_DOCUMENT_PAGES,
        pagerender: async pageData => {
          const content = await pageData.getTextContent({ normalizeWhitespace: true });
          // join pieces on the same line, adding a space only where there is a visible gap
          let lastY, lastEnd, text = '';
          for (const item of content.items) {
            const x = item.transform[4], y = item.transform[5], size = Math.abs(item.transform[0]) || 10;
            if (lastY !== undefined && Math.abs(lastY - y) > 1) text += '\n';
            else if (lastEnd !== undefined && x - lastEnd > size * 0.15 && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
            text += item.str; lastY = y; lastEnd = x + (item.width || 0);
          }
          pages.push({ page: pageData.pageNumber ?? pages.length + 1, text: normalizeText(text) });
          return text;
        }
      });
    } catch { throw fail('The PDF could not be read (it may be encrypted or corrupted).'); }
    const nonEmpty = pages.filter(p => p.text);
    if (!nonEmpty.length) throw fail('No text could be extracted. The PDF appears to be a scanned image without a text layer.');
    return { pages: nonEmpty.sort((a, b) => a.page - b.page), text: nonEmpty.map(p => p.text).join('\n\n'), pageCount: parsed?.numpages || pages.length };
  }
  if (type === 'docx') {
    let r;
    try { r = await mammoth.extractRawText({ buffer }); } catch { throw fail('The DOCX file could not be read (it may be corrupted or not a Word document).'); }
    const text = normalizeText(r.value);
    if (!text) throw fail('The DOCX file contains no text.');
    return { text };
  }
  const text = normalizeText(new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, ''));
  if (!text) throw fail('The file is empty.');
  return { text };
}
