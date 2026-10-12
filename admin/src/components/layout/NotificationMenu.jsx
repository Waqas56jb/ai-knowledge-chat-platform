import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, MailCheck, AlertTriangle, CheckCircle2, ShieldAlert, MessageSquareWarning, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { relativeTime } from '../../utils/format';
import { useClickOutside, useEscape } from '../../hooks/useMisc';
import { useQuery } from '../../hooks/useQuery';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService';
import Tooltip from '../common/Tooltip';

const TYPE = {
  invitation: [MailCheck, 'bg-success-soft text-success'],
  job_failed: [AlertTriangle, 'bg-danger-soft text-danger'],
  job_completed: [CheckCircle2, 'bg-primary-soft text-primary-text'],
  source_indexed: [CheckCircle2, 'bg-primary-soft text-primary-text'],
  access_review: [ShieldAlert, 'bg-warning-soft text-warning'],
  conversation: [MessageSquareWarning, 'bg-warning-soft text-warning'],
  system: [Info, 'bg-info-soft text-info']
};

export default function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const wrap = useRef(null), btn = useRef(null);
  const navigate = useNavigate();
  // poll faster while the menu is open
  const { data, loading, error, reload } = useQuery(getNotifications, [], { refetchInterval: open ? 15000 : 60000 });
  const list = data?.items || [];
  const unread = data?.unread ?? 0;
  useClickOutside(wrap, () => setOpen(false), open);
  useEscape(() => { setOpen(false); btn.current?.focus(); }, open);

  const markRead = async n => {
    try { await markNotificationRead(n.id); reload(); } catch (err) { toast.error(err.message); }
  };
  const openItem = async n => {
    if (!n.read) await markRead(n);
    setOpen(false);
    if (n.link) navigate(n.link);
  };
  const markAll = async () => {
    try { await markAllNotificationsRead(); reload(); toast.success('All notifications marked as read.'); } catch (err) { toast.error(err.message); }
  };
  const shown = filter === 'unread' ? list.filter(n => !n.read) : list;

  return (
    <div ref={wrap} className="relative">
      <Tooltip label="Notifications">
        <button ref={btn} type="button" className="icon-btn relative" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell aria-hidden="true" />
          {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </Tooltip>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Notifications" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div><p className="font-display text-[15px] font-semibold">Notifications</p><p className="text-[12px] text-muted">{unread ? `${unread} unread` : 'You are all caught up'}</p></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={markAll} disabled={!unread}><CheckCheck aria-hidden="true" />Mark all read</button>
            </div>
            <div className="flex gap-1 px-3 pt-2" role="radiogroup" aria-label="Filter notifications">
              {[['all', 'All'], ['unread', 'Unread']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={filter === v} onClick={() => setFilter(v)} className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-medium', filter === v ? 'bg-subtle text-ink' : 'text-muted hover:text-ink')}>{l}</button>
              ))}
            </div>
            <ul className="max-h-[420px] overflow-y-auto p-2">
              {loading && !data && <li className="px-3 py-10 text-center text-[13.5px] text-muted" aria-busy="true">Loading notifications…</li>}
              {error && !data && <li className="px-3 py-8 text-center text-[13.5px] text-danger" role="alert">Notifications could not be loaded. <button type="button" className="link" onClick={reload}>Try again</button></li>}
              {data && !shown.length && <li className="px-3 py-10 text-center text-[13.5px] text-muted">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</li>}
              {shown.map(n => {
                const [Icon, tone] = TYPE[n.type] || TYPE.system;
                return (
                  <li key={n.id}>
                    <div className={cn('group flex gap-3 rounded-xl p-2.5 transition hover:bg-subtle', !n.read && 'bg-primary-soft/40')}>
                      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', tone)}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <button type="button" onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2"><span className="truncate text-[13.5px] font-semibold text-ink">{n.title}</span>{!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-strong" aria-label="Unread" />}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{n.body}</span>
                        <span className="mt-1 block text-[12px] text-faint">{relativeTime(n.at)}</span>
                      </button>
                      {!n.read && <button type="button" onClick={() => markRead(n)} className="self-start rounded px-1.5 py-0.5 text-[11.5px] font-medium text-primary-text opacity-100 hover:underline sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">Mark read</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
