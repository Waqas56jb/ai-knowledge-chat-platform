import { api } from './api';

export const notificationService = {
  /** GET /notifications → { data: Notification[], meta: { unread } } */
  list: () => api.list('/notifications'),
  read: id => api.patch(`/notifications/${id}/read`, {}),
  readAll: () => api.post('/notifications/read-all')
};
