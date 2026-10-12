import { z } from 'zod';
import { ROLES, USER_STATUSES } from '../constants/domain';

export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export const emailField = z.string().trim().min(1, 'Enter an email address.').email('Enter a valid email address.');
export const requiredText = (label, max = 200) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

export const userSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name (at least 2 characters).').max(80, 'Name must be 80 characters or fewer.'),
  email: emailField,
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Choose a role.' }) }),
  status: z.enum(USER_STATUSES),
  department: z.string().trim().max(60, 'Department must be 60 characters or fewer.').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer.').optional().or(z.literal('')),
  sourceAccess: z.enum(['workspace', 'restricted']),
  allowedSourceIds: z.array(z.string())
}).superRefine((v, ctx) => {
  if (v.sourceAccess === 'restricted' && !v.allowedSourceIds.length) ctx.addIssue({ code: 'custom', path: ['allowedSourceIds'], message: 'Choose at least one source, or allow all workspace sources.' });
});

export const invitationSchema = z.object({
  email: emailField,
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Choose a role.' }) }),
  expiresInDays: z.coerce.number().int().min(1).max(60),
  message: z.string().max(500, 'Message must be 500 characters or fewer.').optional().or(z.literal('')),
  note: z.string().max(300, 'Note must be 300 characters or fewer.').optional().or(z.literal(''))
});
