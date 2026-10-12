import { LayoutDashboard, Users, MailPlus, Library, Cpu, MessagesSquare, MessageCircleQuestion, BarChart3, ScrollText, Settings } from 'lucide-react';

/** Sidebar structure. `badge` names a live count computed in AdminSidebar. */
export const NAV_GROUPS = [
  { label: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'People', items: [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/invitations', label: 'Invitations', icon: MailPlus, badge: 'pendingInvitations' }
  ] },
  { label: 'Knowledge', items: [
    { to: '/admin/knowledge', label: 'Knowledge Sources', icon: Library },
    { to: '/admin/processing', label: 'Processing Jobs', icon: Cpu, badge: 'failedJobs', badgeTone: 'danger' }
  ] },
  { label: 'Oversight', items: [
    { to: '/admin/conversations', label: 'Conversations', icon: MessagesSquare, badge: 'needsReview' },
    { to: '/admin/content-gaps', label: 'Unanswered questions', icon: MessageCircleQuestion, badge: 'openGaps' },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText }
  ] },
  { label: 'System', items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }] }
];

/** Human labels for URL segments (breadcrumbs). */
export const SEGMENT_LABELS = {
  dashboard: 'Dashboard', users: 'Users', invitations: 'Invitations', new: 'New invitation', knowledge: 'Knowledge Sources', add: 'Add source',
  processing: 'Processing Jobs', conversations: 'Conversations', 'content-gaps': 'Unanswered questions', analytics: 'Analytics', audit: 'Audit Logs', settings: 'Settings',
  profile: 'Profile', platform: 'Platform', security: 'Security', 'domain-policy': 'Domain policy', chat: 'Chat limits', appearance: 'Appearance'
};
