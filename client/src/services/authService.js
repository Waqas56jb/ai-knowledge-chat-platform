import { api, sessionStorageApi } from './api';

export const authService = {
  session: () => sessionStorageApi.get(),
  async login(email, password, remember = true) {
    const s = await api.post('/auth/login', { email, password }, { auth: false });
    return sessionStorageApi.set(s, remember);
  },
  /** GET /auth/me → { user, settings } and keeps the stored user fresh. */
  async me() {
    const r = await api.get('/auth/me');
    sessionStorageApi.setUser(r.user);
    return r;
  },
  async logout() {
    try { await api.post('/auth/logout'); } finally { sessionStorageApi.clear(); }
  },
  forgotPassword: email => api.post('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (accessToken, password) => api.post('/auth/reset-password', { accessToken, password }, { auth: false }),
  validateInvitation: token => api.post('/auth/validate-invitation', { token }, { auth: false }),
  async acceptInvitation({ token, fullName, password }) {
    const s = await api.post('/auth/accept-invitation', { token, fullName, password }, { auth: false });
    return sessionStorageApi.set(s, true);
  },
  clear: () => sessionStorageApi.clear()
};
