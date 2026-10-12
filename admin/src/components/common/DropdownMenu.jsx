import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useClickOutside, useEscape } from '../../hooks/useMisc';

/**
 * Accessible dropdown.
 * <DropdownMenu label="Actions for X" trigger={(props) => <button {...props}>…</button>} align="end"
 *   items={[{ label: 'View', icon: Eye, to: '/x' }, { label: 'Delete', icon: Trash2, onClick, danger: true }, { divider: true }]} />
 * `trigger` receives the props it must spread (ref, onClick, aria-*). Arrow keys move between items.
 */
export default function DropdownMenu({ trigger, items = [], align = 'end', placement = 'bottom', label, width = 'w-52', header, children, panelClassName }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null), btn = useRef(null), menu = useRef(null);
  useClickOutside(wrap, () => setOpen(false), open);
  useEscape(() => { setOpen(false); btn.current && btn.current.focus(); }, open);

  const focusItem = dir => {
    const els = [...(menu.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || [])];
    if (!els.length) return;
    const i = els.indexOf(document.activeElement);
    els[(i + dir + els.length) % els.length].focus();
  };
  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(-1); }
    if (e.key === 'Tab') setOpen(false);
  };
  const toggle = e => { e.stopPropagation(); setOpen(o => !o); if (!open) setTimeout(() => focusItem(1), 40); };

  return (
    <div ref={wrap} className="relative inline-flex" onClick={e => e.stopPropagation()}>
      {trigger({ ref: btn, onClick: toggle, 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-label': label })}
      <AnimatePresence>
        {open && (
          <motion.div ref={menu} role="menu" aria-label={label} onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.12 }}
            className={cn('absolute z-50 rounded-xl', placement === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-1.5 origin-top', ' border border-line bg-surface p-1.5 shadow-pop', align === 'end' ? 'right-0' : 'left-0', width, panelClassName)}>
            {header}
            {children}
            {items.filter(Boolean).map((it, i) => it.divider ? <div key={`d${i}`} role="separator" className="my-1.5 border-t border-line" /> : (
              <MenuItem key={it.label} item={it} onDone={() => setOpen(false)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ item, onDone }) {
  const { label, icon: Icon, onClick, to, href, danger, disabled, hint } = item;
  const cls = cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] outline-none transition focus-visible:bg-subtle disabled:cursor-not-allowed disabled:opacity-45',
    danger ? 'text-danger hover:bg-danger-soft focus-visible:bg-danger-soft' : 'text-ink hover:bg-subtle');
  const inner = <>{Icon && <Icon className={cn('h-4 w-4 shrink-0', danger ? '' : 'text-muted')} aria-hidden="true" />}<span className="flex-1">{label}</span>{hint && <span className="text-[11.5px] text-faint">{hint}</span>}</>;
  if (to) return <Link role="menuitem" to={to} className={cls} onClick={onDone}>{inner}</Link>;
  if (href) return <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onDone}>{inner}</a>;
  return <button role="menuitem" type="button" className={cls} disabled={disabled} onClick={() => { onDone(); onClick && onClick(); }}>{inner}</button>;
}
