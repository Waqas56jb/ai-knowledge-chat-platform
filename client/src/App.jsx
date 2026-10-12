import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { BRAND } from './data/config';
import ErrorBoundary from './components/common/ErrorBoundary';
import Toasts from './components/common/Toasts';
import Modal from './components/common/Modal';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Legal from './pages/Legal';
import NotFound, { AppNotFound } from './pages/NotFound';
import Overview from './pages/Overview';
import Chat from './pages/Chat';
import History from './pages/History';
import Sources from './pages/Sources';
import SourceDetail from './pages/SourceDetail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

const TITLES = { '/': '', '/login': 'Sign in', '/register': 'Register', '/forgot-password': 'Forgot password', '/reset-password': 'Reset password', '/app': 'Overview', '/app/history': 'Chat history', '/app/sources': 'Knowledge sources', '/app/profile': 'Profile', '/app/settings': 'Settings' };

/** Workspace routes need a session; remember where the visitor was going. */
function RequireAuth({ children }) {
  const { session } = useApp();
  const loc = useLocation();
  return session ? children : <Navigate to="/login" replace state={{ from: loc.pathname, notice: 'Sign in to open your workspace.' }} />;
}
/** Sign-in and registration are skipped when already signed in. */
function GuestOnly({ children }) {
  const { session } = useApp();
  const { state } = useLocation(); // after signing in, go back to the page that required it
  return session ? <Navigate to={(state && state.from) || '/app'} replace /> : children;
}

/** Per-route side effects: title, scroll reset, closing the source panel and any dialog. */
function RouteEffects() {
  const { pathname } = useLocation();
  const { setUi, closeModal } = useApp();
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
    const parts = path.split('/').filter(Boolean);
    const t = TITLES[path] ?? (parts[1] === 'chat' ? 'Chat' : parts[1] === 'sources' ? 'Source' : '');
    document.title = (t ? t + ' · ' : '') + BRAND.name;
    window.scrollTo(0, 0);
    const c = document.querySelector('.content'); if (c) c.scrollTop = 0;
    setUi({ panel: null }); closeModal();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function App() {
  const skip = e => { e.preventDefault(); const m = document.getElementById('main'); if (m) { m.tabIndex = -1; m.focus(); } };
  return (
    <ErrorBoundary>
      <a className="sr skip" href="#main" onClick={skip}>Skip to content</a>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:id" element={<Chat />} />
          <Route path="history" element={<History />} />
          <Route path="sources" element={<Sources />} />
          <Route path="sources/:id" element={<SourceDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<AppNotFound />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Modal />
      <Toasts />
    </ErrorBoundary>
  );
}
