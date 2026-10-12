import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import { getAppearance } from '../services/settingsService';
import AdminSidebar from '../components/layout/AdminSidebar';
import AdminHeader from '../components/layout/AdminHeader';
import { PageSkeleton } from '../components/common/States';

const SIDEBAR_KEY = 'nexus-admin:sidebar';

/** Authenticated shell: sidebar + header + routed page. */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { const v = localStorage.getItem(SIDEBAR_KEY); if (v) return v === 'collapsed'; } catch (e) { /* storage unavailable */ }
    return getAppearance().sidebar === 'collapsed';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); window.scrollTo(0, 0); }, [pathname]);

  const toggle = () => setCollapsed(c => { try { localStorage.setItem(SIDEBAR_KEY, c ? 'expanded' : 'collapsed'); } catch (e) { /* ignore */ } return !c; });

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[100] rounded-lg bg-surface px-3 py-2 text-[13.5px] font-semibold shadow-pop">Skip to content</a>
      <AdminSidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <AdminHeader onMenu={() => setMobileOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
        </main>
        <footer className="border-t border-line px-6 py-4 text-center text-[12px] text-faint">NEXUS AI Admin · Connected to the NEXUS AI API.</footer>
      </div>
    </div>
  );
}
