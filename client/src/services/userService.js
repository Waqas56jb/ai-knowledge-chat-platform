import { api } from './api';

export const userService = {
  overview: () => api.get('/users/me/overview'),
  /** PATCH /users/me { fullName, department, timezone, language, preferences } → Profile */
  update: changes => api.patch('/users/me', changes)
};
