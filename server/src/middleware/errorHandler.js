import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/** Last middleware: consistent JSON errors, never stack traces, SQL or secrets. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let e = err;
  if (err?.type === 'entity.too.large') e = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  else if (err?.type === 'entity.parse.failed') e = ApiError.badRequest('The request body is not valid JSON.');
  else if (err?.name === 'MulterError') e = new ApiError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR', err.code === 'LIMIT_FILE_SIZE' ? 'The file is larger than the allowed upload size.' : 'The upload could not be processed.');
  else if (err?.code === '23505') e = ApiError.conflict('A record with these details already exists.');
  else if (err?.code === '23503') e = ApiError.conflict('A related record does not exist or is still in use.');
  else if (err?.code === '22P02') e = ApiError.badRequest('An identifier in the request is malformed.');
  else if (!(err instanceof ApiError)) e = null;

  if (!e) {
    logger.error({ requestId: req.id, route: req.originalUrl, err: { name: err?.name, code: err?.code, message: err?.message } }, 'unhandled error');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.', requestId: req.id } });
  }
  if (e.status >= 500) logger.warn({ requestId: req.id, code: e.code }, e.message);
  res.status(e.status).json({ success: false, error: { code: e.code, message: e.message, requestId: req.id, ...(e.details ? { details: e.details } : {}) } });
}

export function notFound(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`));
}
