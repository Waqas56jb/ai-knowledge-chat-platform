import crypto from 'node:crypto';

/** Attach a request id (client-supplied if it looks safe, otherwise generated). */
export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.id = incoming && /^[A-Za-z0-9._-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
