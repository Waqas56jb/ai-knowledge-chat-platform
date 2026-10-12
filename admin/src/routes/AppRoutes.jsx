import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { RequireAuth, GuestOnly } from './guards';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import NotFoundPage from '../pages/errors/NotFoundPage';
import { PageSkeleton } from '../components/common/States';

/* Pages are code-split so each section loads on demand. */
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const UserDetailPage = lazy(() => import('../pages/users/UserDetailPage'));
const InvitationsPage = lazy(() => import('../pages/invitations/InvitationsPage'));
const NewInvitationPage = lazy(() => import('../pages/invitations/NewInvitationPage'));
const KnowledgePage = lazy(() => import('../pages/knowledge/KnowledgePage'));
const AddSourcePage = lazy(() => import('../pages/knowledge/AddSourcePage'));
const SourceDetailPage = lazy(() => import('../pages/knowledge/SourceDetailPage'));
const ProcessingPage = lazy(() => import('../pages/processing/ProcessingPage'));
const ConversationsPage = lazy(() => import('../pages/conversations/ConversationsPage'));
const ConversationDetailPage = lazy(() => import('../pages/conversations/ConversationDetailPage'));
const ContentGapsPage = lazy(() => import('../pages/contentGaps/ContentGapsPage'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));
const AuditPage = lazy(() => import('../pages/audit/AuditPage'));
const SettingsLayout = lazy(() => import('../pages/settings/SettingsLayout'));
const SettingsIndex = lazy(() => import('../pages/settings/SettingsIndex'));
const ProfileSettings = lazy(() => import('../pages/settings/ProfileSettings'));
const PlatformSettings = lazy(() => import('../pages/settings/PlatformSettings'));
const KnowledgeSettings = lazy(() => import('../pages/settings/KnowledgeSettings'));
const SecuritySettings = lazy(() => import('../pages/settings/SecuritySettings'));
const DomainPolicySettings = lazy(() => import('../pages/settings/DomainPolicySettings'));
const ChatSettings = lazy(() => import('../pages/settings/ChatSettings'));
const AppearanceSettings = lazy(() => import('../pages/settings/AppearanceSettings'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />

        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="invitations/new" element={<NewInvitationPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="knowledge/add" element={<AddSourcePage />} />
          <Route path="knowledge/:sourceId" element={<SourceDetailPage />} />
          <Route path="processing" element={<ProcessingPage />} />
          <Route path="conversations" element={<ConversationsPage />} />
          <Route path="conversations/:conversationId" element={<ConversationDetailPage />} />
          <Route path="content-gaps" element={<ContentGapsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsIndex />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="platform" element={<PlatformSettings />} />
            <Route path="knowledge" element={<KnowledgeSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="domain-policy" element={<DomainPolicySettings />} />
            <Route path="chat" element={<ChatSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
          </Route>
          <Route path="*" element={<NotFoundPage embedded />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
