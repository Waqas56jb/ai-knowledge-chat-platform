import { ApiError } from '../utils/ApiError.js';

/**
 * Validate and coerce request parts with Zod. Unknown body keys are stripped (schemas use .strict()
 * where unexpected fields must be rejected, e.g. to block self-promotion attempts).
 *   router.post('/', validate({ body: schema, query: schema, params: schema }), handler)
 */
export const validate = schemas => (req, _res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const r = schemas[part].safeParse(req[part] ?? {});
      if (!r.success) {
        const details = r.error.issues.map(i => ({ field: [part, ...i.path].join('.'), message: i.message }));
        throw ApiError.validation(details[0] ? `${details[0].field}: ${details[0].message}` : undefined, details);
      }
      if (part === 'query') Object.defineProperty(req, 'validQuery', { value: r.data }); else req[part] = r.data;
    }
    next();
  } catch (e) { next(e); }
};
