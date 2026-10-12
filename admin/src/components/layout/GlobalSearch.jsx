import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Users, MailPlus, Library, MessagesSquare, Cpu, CornerDownLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useMisc';
import { globalSearch, SEARCH_GROUPS } from '../../services/searchService';
import { NAV_GROUPS } from './navigation';

const ICONS = { users: Users, invitations: MailPlus, sources: Library, conversations: MessagesSquare, jobs: Cpu };

/**
 * Command-palette search over users, invitations, sources, conversations and jobs.
 * Opens with the header button, Ctrl/⌘+K or "/". Arrow keys move, Enter opens, Escape closes.
 */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKey = e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search the admin console" aria-keyshortcuts="Control+K"
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13.5px] text-faint shadow-sm transition hover:border-primary/50 hover:text-muted sm:w-64 md:w-72">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:block">Search users, sources…</span>
        <span className="kbd hidden sm:inline">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      {createPortal(<AnimatePresence>{open && <Palette onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </>
  );
}

function Palette({ onClose }) {
  const navigate = useNavigate();
  const input = useRef(null), list = useRef(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const dq = useDebounce(q, 250);

  useEffect(() => { input.current?.focus(); const prev = document.activeElement; return () => prev?.focus?.(); }, []);
  useEffect(() => {
    let alive = true;
    if (!dq.trim()) { setRes(null); setError(null); setSearching(false); return undefined; }
    setSearching(true);
    globalSearch(dq).then(
      r => { if (alive) { setRes(r); setError(null); setActive(0); setSearching(false); } },
      err => { if (alive) { setRes(null); setError(err); setSearching(false); } }
    );
    return () => { alive = false; };
  }, [dq]);

  const pages = useMemo(() => NAV_GROUPS.flatMap(g => g.items).filter(i => !q.trim() || i.label.toLowerCase().includes(q.trim().toLowerCase())).map(i => ({ id: i.to, title: i.label, subtitle: 'Go to page', to: i.to, icon: i.icon })), [q]);
  const flat = useMemo(() => {
    const out = [];
    if (res && q.trim()) SEARCH_GROUPS.forEach(([key, label]) => res[key].forEach(r => out.push({ ...r, group: label, icon: ICONS[key] })));
    pages.slice(0, q.trim() ? 3 : 9).forEach(p => out.push({ ...p, group: 'Pages' }));
    return out;
  }, [res, pages, q]);

  const go = item => { onClose(); navigate(item.to); };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(flat.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]); }
  };
  useEffect(() => { list.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  let lastGroup = null;
  return (
    <motion.div className="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
      <div className="absolute inset-0 bg-[#0a0907]/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div role="dialog" aria-modal="true" aria-label="Search" initial={{ y: -8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -8, scale: 0.98 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-faint" aria-hidden="true" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search users, invitations, sources, conversations, jobs…"
            className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-faint" role="combobox" aria-expanded="true" aria-controls="gs-list"
            aria-activedescendant={flat[active] ? `gs-${active}` : undefined} aria-label="Search query" />
          <span className="kbd">Esc</span>
        </div>
        <ul id="gs-list" ref={list} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim() && searching && !res && <li className="px-3 py-8 text-center text-[13.5px] text-muted" aria-busy="true">Searching…</li>}
          {q.trim() && error && <li className="px-3 py-8 text-center text-[13.5px] text-danger" role="alert">Search failed: {error.message}</li>}
          {q.trim() && !searching && res && res.total === 0 && <li className="px-3 py-8 text-center text-[13.5px] text-muted">No results for “{q}”. Try a name, email, source title or job ID.</li>}
          {flat.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null; lastGroup = it.group;
            const Icon = it.icon || ArrowRight;
            return (
              <li key={`${it.group}-${it.id}`} role="presentation">
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint first:pt-1">{header}</p>}
                <div id={`gs-${i}`} data-idx={i} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(it)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5', i === active ? 'bg-subtle' : '')}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-text"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium text-ink">{it.title}</span><span className="block truncate text-[12.5px] text-muted">{it.subtitle}</span></span>
                  {i === active && <CornerDownLeft className="h-4 w-4 text-faint" aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line bg-subtle/50 px-4 py-2 text-[12px] text-faint">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> to navigate</span><span><span className="kbd">Enter</span> to open</span><span className="ml-auto">{searching ? 'Searching…' : res && q.trim() ? `${res.total} ${res.total === 1 ? 'result' : 'results'}` : ''}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
