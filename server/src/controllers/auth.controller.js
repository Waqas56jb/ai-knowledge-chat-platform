import { asyncHandler, ok } from '../utils/asyncHandler.js';
import * as auth from '../services/auth.service.js';
import { getPublicSettings } from '../services/settings.service.js';

export const login = asyncHandler(async (req, res) => ok(res, await auth.login(req.body.email, req.body.password, req)));
export const refresh = asyncHandler(async (req, res) => ok(res, await auth.refresh(req.body.refreshToken)));
export const logout = asyncHandler(async (req, res) => { await auth.logout(req.user, req.accessToken, req); ok(res, { signedOut: true }); });
export const me = asyncHandler(async (req, res) => ok(res, { user: auth.publicProfile(req.user), settings: await getPublicSettings() }));
export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.forgotPassword(req.body.email, auth.RESET_REDIRECT, req);
  ok(res, { message: 'If an active account exists for this email, a password reset link has been sent.' });
});
export const resetPassword = asyncHandler(async (req, res) => { await auth.resetPassword(req.body.accessToken, req.body.password, req); ok(res, { message: 'Password updated. Sign in with the new password.' }); });
export const validateInvitation = asyncHandler(async (req, res) => ok(res, await auth.validateInvitation(req.body.token)));
export const acceptInvitation = asyncHandler(async (req, res) => ok(res, await auth.acceptInvitation(req.body, req), undefined, 201));
