/** The signed-in admin's notifications — /notifications. */
import { apiList, request } from './api';

const mapNotification = n => ({ ...n, body: n.message || '', at: n.created_at, read: !!n.read_at });

/** → { items, unread } */
export async function getNotifications() {
  const { rows, meta } = await apiList('/notifications');
  const items = rows.map(mapNotification);
  return { items, unread: meta.unread ?? items.filter(n => !n.read).length };
}

/* These do not invalidate every page; the menu reloads itself. */
export const markNotificationRead = id => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', invalidate: false });
export const markAllNotificationsRead = () => request('/notifications/read-all', { method: 'POST', invalidate: false });
