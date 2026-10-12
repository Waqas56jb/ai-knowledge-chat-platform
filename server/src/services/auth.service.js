/**
 * Authentication with Supabase Auth (no custom password storage).
 * - Sign-in / refresh go through Supabase Auth with the anon key, server-side.
 * - Accounts are created ONLY by accepting a valid invitation (or the CLI admin bootstrap).
 * - The shared Supabase Auth instance may contain users of other projects: an existing auth user
 *   that is not part of this app is never modified (no password reset, no linking).
 */
import { supabaseAdmin, createAuthClient } from '../config/supabase.js';
import { tx, one } from '../config/database.js';
import { T } from '../config/constants.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { hashToken } from '../utils/sanitize.js';
import { recordAudit } from './audit.service.js';
import { notifyAdmins } from './notification.service.js';
import { loadProfile, forgetToken, verifyAccessToken } from '../middleware/authenticate.js';
import { logger } from '../utils/logger.js';

export const publicProfile = p => p && ({
  id: p.id, email: p.email, fullName: p.full_name, role: p.role, status: p.status, avatarUrl: p.avatar_url,
  department: p.department, timezone: p.timezone, language: p.language, preferences: p.preferences || {},
  createdAt: p.created_at, lastActiveAt: p.last_active_at
});

const sessionOut = (s, profile) => ({
  accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: s.expires_at, tokenType: 'bearer', user: publicProfile(profile)
});

export async function login(email, password, req) {
  const auth = createAuthClient();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    if (error && error.status >= 500) throw ApiError.unavailable('Authentication service is unavailable.');
    await recordAudit({ action: 'auth.login_failed', entityType: 'auth', entityLabel: email, result: 'failure', details: { reason: 'invalid_credentials' }, req });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  const profile = await loadProfile(data.user.id);
  if (!profile) {
    await recordAudit({ action: 'auth.login_failed', entityType: 'auth', entityLabel: email, result: 'failure', details: { reason: 'no_app_profile' }, req });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  if (profile.status !== 'active') {
    await recordAudit({ actor: profile, action: 'auth.login_failed', entityType: 'auth', entityId: profile.id, entityLabel: email, result: 'failure', details: { reason: profile.status }, req });
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is not active. Contact a workspace administrator.');
  }
  await recordAudit({ actor: profile, action: 'auth.login', entityType: 'auth', entityId: profile.id, entityLabel: profile.email, req });
  return sessionOut(data.session, profile);
}

export async function refresh(refreshToken) {
  const auth = createAuthClient();
  const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) throw ApiError.unauthorized('Your session has expired. Sign in again.');
  const profile = await loadProfile(data.user.id);
  if (!profile || profile.status !== 'active') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is not active.');
  return sessionOut(data.session, profile);
}

export async function logout(user, accessToken, req) {
  forgetToken(accessToken);
  // revoke refresh tokens for this session; the short-lived access token expires on its own
  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'local');
  if (error) logger.warn({ code: error.code }, 'supabase signOut failed');
  await recordAudit({ actor: user, action: 'auth.logout', entityType: 'auth', entityId: user.id, entityLabel: user.email, req });
}

/** Always returns success to avoid revealing which emails have accounts. */
export async function forgotPassword(email, redirectTo, req) {
  const profile = await one(`select id from ${T.profiles} where lower(email) = lower($1) and status = 'active'`, [email]);
  if (profile) {
    const { error } = await createAuthClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) logger.warn({ code: error.code, status: error.status }, 'password reset email failed');
    await recordAudit({ action: 'auth.password_reset_requested', entityType: 'auth', entityId: profile.id, entityLabel: email, req });
  }
}

/** Complete a reset: the recovery access token (from the emailed link) proves ownership. */
export async function resetPassword(recoveryAccessToken, newPassword, req) {
  const { userId } = await verifyAccessToken(recoveryAccessToken);
  const profile = await loadProfile(userId);
  if (!profile) throw ApiError.forbidden('This account does not have access to NEXUS AI.');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw ApiError.badRequest('The password could not be updated. Use a stronger password and try again.');
  forgetToken(recoveryAccessToken);
  await recordAudit({ actor: profile, action: 'auth.password_reset', entityType: 'auth', entityId: userId, entityLabel: profile.email, req });
}

/** Look up an open invitation by raw token. Returns null when invalid/expired/used/revoked. */
async function findOpenInvitation(db, rawToken, lock = false) {
  return (await db.query(
    `select * from ${T.invitations} where token_hash = $1 ${lock ? 'for update' : ''}`, [hashToken(rawToken)])).rows[0] || null;
}

function invitationState(inv) {
  if (!inv) return 'invalid';
  if (inv.revoked_at) return 'revoked';
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at).getTime() <= Date.now()) return 'expired';
  return 'pending';
}
const STATE_ERROR = {
  invalid: ['INVITATION_INVALID', 'This invitation is not valid. Check the link or ask an administrator for a new one.'],
  revoked: ['INVITATION_REVOKED', 'This invitation has been revoked. Ask an administrator for a new one.'],
  accepted: ['INVITATION_USED', 'This invitation has already been used. Sign in instead.'],
  expired: ['INVITATION_EXPIRED', 'This invitation has expired. Ask an administrator to resend it.']
};

export async function validateInvitation(rawToken) {
  const inv = await one(`select * from ${T.invitations} where token_hash = $1`, [hashToken(rawToken)]);
  const state = invitationState(inv);
  if (state !== 'pending') throw new ApiError(400, ...STATE_ERROR[state]);
  return { email: inv.email, role: inv.role, expiresAt: inv.expires_at };
}

/**
 * Accept an invitation and create the account. Atomic with respect to the invitation row
 * (SELECT ... FOR UPDATE), so two concurrent acceptances cannot both succeed.
 */
export async function acceptInvitation({ token, email, fullName, password }, req) {
  let createdAuthUserId = null;
  try {
    const result = await tx(async db => {
      const inv = await findOpenInvitation(db, token, true);
      const state = invitationState(inv);
      if (state !== 'pending') throw new ApiError(400, ...STATE_ERROR[state]);
      if (email && email.toLowerCase() !== inv.email.toLowerCase()) throw new ApiError(400, 'INVITATION_EMAIL_MISMATCH', 'This invitation was sent to a different email address.');

      const existingProfile = (await db.query(`select id from ${T.profiles} where lower(email) = lower($1)`, [inv.email])).rows[0];
      if (existingProfile) throw ApiError.conflict('An account with this email already exists. Sign in instead.');
      const existingAuth = (await db.query('select id from auth.users where lower(email) = lower($1)', [inv.email])).rows[0];
      if (existingAuth) throw ApiError.conflict('This email is already registered with the authentication service. Ask an administrator for help.');

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: inv.email, password, email_confirm: true, user_metadata: { full_name: fullName, app: 'nexus-ai' }
      });
      if (error || !data?.user) {
        if (/password/i.test(error?.message || '')) throw ApiError.validation('The password does not meet the security requirements.');
        throw ApiError.unavailable('The account could not be created. Please try again.');
      }
      createdAuthUserId = data.user.id;

      await db.query(`insert into ${T.profiles} (id, email, full_name, role, status) values ($1, $2, $3, $4, 'active')`, [data.user.id, inv.email, fullName, inv.role]);
      await db.query(`update ${T.invitations} set accepted_at = now(), accepted_by = $2 where id = $1`, [inv.id, data.user.id]);
      await recordAudit({ actor: { id: data.user.id, email: inv.email }, action: 'invitation.accepted', entityType: 'invitation', entityId: inv.id, entityLabel: inv.email, details: { role: inv.role }, req }, db);
      await notifyAdmins({ type: 'invitation', title: 'Invitation accepted', message: `${fullName} (${inv.email}) joined the workspace.`, link: `/admin/users/${data.user.id}` }, db);
      return { userId: data.user.id, email: inv.email };
    });
    createdAuthUserId = null; // committed
    return await login(result.email, password, req);
  } catch (e) {
    if (createdAuthUserId) {
      // compensate: the profile/invitation transaction failed after the auth user was created
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(err => logger.error({ code: err?.code }, 'failed to roll back auth user'));
    }
    throw e;
  }
}

export const passwordRules = { min: 8, max: 72 };
export const isStrongPassword = p => typeof p === 'string' && p.length >= passwordRules.min && p.length <= passwordRules.max && /[A-Za-z]/.test(p) && /\d/.test(p);

export const RESET_REDIRECT = `${env.CLIENT_URL}/reset-password`;
