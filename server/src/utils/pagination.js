import { z } from 'zod';

/** ?page=1&pageSize=25 (bounded). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25)
});

export const toLimitOffset = ({ page, pageSize }) => ({ limit: pageSize, offset: (page - 1) * pageSize });

export const pageMeta = ({ page, pageSize }, total) => ({ page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
