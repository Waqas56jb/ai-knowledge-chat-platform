import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, LogOut, MoreHorizontal, UserCog, Palette, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '../../hooks/useQuery';
import { getInvitationStats } from '../../services/invitationService';
import { getJobStats } from '../../services/processingService';
import { getConversationStats } from '../../services/conversationService';
import { getContentGapStats } from '../../services/contentGapService';
import { roleLabel } from '../../constants/domain';
import Avatar from '../common/Avatar';
import Tooltip from '../common/Tooltip';
import DropdownMenu from '../common/DropdownMenu';
import Logo from './Logo';
import { NAV_GROUPS } from './navigation';

/** Live counts for the nav badges (refreshed after any change and every minute). */
async function loadBadges() {
  const [inv, jobs, conv, gaps] = await Promise.all([getInvitationStats(), getJobStats(), getConversationStats(), getContentGapStats()]);
  return { pendingInvitations: inv.pending, failedJobs: jobs.failed, needsReview: conv.needsReview, openGaps: gaps.open };
}
function useBadges() {
  const { data } = useQuery(loadBadges, [], { refetchInterval: 60000 });
  return data || {};
}

function SidebarBody({ collapsed, onToggle, onNavigate, mobile = false }) {
  const { name, user, logout } = useAuth();
  const navigate = useNavigate();
  const badges = useBadges();
  const signOut = async () => { await logout(); toast.success('Signed out.'); navigate('/login'); };

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center border-b border-sidebar-line', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        <NavLink to="/admin/dashboard" onClick={onNavigate} className="rounded-lg" aria-label="NEXUS AI Admin dashboard"><Logo collapsed={collapsed} /></NavLink>
        {mobile
          ? <button type="button" className="icon-btn text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text" onClick={onNavigate} aria-label="Close navigation"><X aria-hidden="true" /></button>
          : !collapsed && <button type="button" className="icon-btn icon-btn-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text" onClick={onToggle} aria-label="Collapse sidebar"><ChevronsLeft aria-hidden="true" /></button>}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
        {NAV_GROUPS.map(g => (
          <div key={g.label} className="mb-4 last:mb-0">
            {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">{g.label}</p>}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-sidebar-line" aria-hidden="true" />}
            <ul className="space-y-0.5">
              {g.items.map(it => {
                const count = it.badge ? badges[it.badge] || 0 : 0;
                const link = (
                  <NavLink to={it.to} onClick={onNavigate}
                    className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-lg text-[13.5px] font-medium transition',
                      collapsed ? 'h-10 w-10 justify-center' : 'px-3 py-2',
                      isActive ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary-strong' : 'text-sidebar-text/75 hover:bg-sidebar-hover hover:text-sidebar-text')}
                    aria-label={collapsed ? `${it.label}${count ? `, ${count} need attention` : ''}` : undefined}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-primary" aria-hidden="true" />}
                        <it.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'text-sidebar-muted group-hover:text-sidebar-text')} aria-hidden="true" />
                        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                        {count > 0 && (collapsed
                          ? <span className={cn('absolute right-1.5 top-1.5 h-2 w-2 rounded-full', it.badgeTone === 'danger' ? 'bg-danger' : 'bg-primary')} aria-hidden="true" />
                          : <span className={cn('rounded-full px-1.5 text-[11px] font-semibold', it.badgeTone === 'danger' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary')}>{count}</span>)}
                      </>
                    )}
                  </NavLink>
                );
                return <li key={it.to} className={collapsed ? 'flex justify-center' : undefined}>{collapsed ? <Tooltip label={it.label} side="right">{link}</Tooltip> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!mobile && collapsed && (
        <div className="flex justify-center pb-2"><Tooltip label="Expand sidebar" side="right"><button type="button" className="icon-btn text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text" onClick={onToggle} aria-label="Expand sidebar"><ChevronsRight aria-hidden="true" /></button></Tooltip></div>
      )}

      <div className="shrink-0 border-t border-sidebar-line p-3">
        <div className={cn('flex items-center gap-3 rounded-xl', !collapsed && 'bg-sidebar-hover/70 p-2.5')}>
          <Avatar name={name} gold size="md" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-sidebar-text">{name}</p>
              <p className="truncate text-[12px] text-sidebar-muted">{roleLabel(user?.role)}</p>
            </div>
          )}
          <DropdownMenu label="Account menu" align={collapsed ? 'start' : 'end'} placement="top"
            trigger={p => <button type="button" {...p} className="icon-btn icon-btn-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text"><MoreHorizontal aria-hidden="true" /></button>}
            header={<div className="mb-1 border-b border-line px-2.5 pb-2 pt-1"><p className="truncate text-[13.5px] font-semibold">{name}</p><p className="truncate text-[12px] text-muted">{user?.email}</p></div>}
            items={[
              { label: 'Profile settings', icon: UserCog, to: '/admin/settings/profile' },
              { label: 'Appearance', icon: Palette, to: '/admin/settings/appearance' },
              { divider: true },
              { label: 'Sign out', icon: LogOut, onClick: signOut, danger: true }
            ]} />
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar (collapsible) + mobile slide-out drawer. */
export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-line bg-sidebar transition-[width] duration-200 lg:block', collapsed ? 'w-[76px]' : 'w-[264px]')} aria-label="Sidebar">
        <SidebarBody collapsed={collapsed} onToggle={onToggle} />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onMobileClose} />
            <motion.aside className="absolute inset-y-0 left-0 w-[284px] max-w-[86vw] bg-sidebar shadow-pop" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              <SidebarBody collapsed={false} mobile onNavigate={onMobileClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
