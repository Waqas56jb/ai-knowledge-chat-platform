import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Right-hand side drawer with the same accessibility behaviour as Modal: focus moves inside,
 * Tab is trapped, Escape / backdrop close it and focus returns to the opener.
 */
export default function Drawer({ open, onClose, title, subtitle, children, footer, labelledBy }) {
  const panel = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || autoId;
  const reduce = useReducedMotion();
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const t = setTimeout(() => panel.current && panel.current.focus(), 30);
    const onKey = e => {
      // ignore keys while another dialog (e.g. a confirmation) stacked on top has focus
      if (panel.current && document.activeElement && document.activeElement !== document.body && !panel.current.contains(document.activeElement)) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey, true); document.body.style.overflow = overflow; if (prev && prev.focus && document.contains(prev)) prev.focus(); };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15 }}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-pop outline-none"
            initial={reduce ? false : { x: 40, opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? undefined : { x: 40, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-[17px] font-semibold">{title}</h2>
                {subtitle && <div className="mt-1 text-[13px] text-muted">{subtitle}</div>}
              </div>
              <button type="button" className="icon-btn icon-btn-sm -mr-1.5 -mt-1" onClick={onClose} aria-label="Close panel"><X aria-hidden="true" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
