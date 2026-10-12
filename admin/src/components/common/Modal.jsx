import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Accessible dialog: focus moves inside, Tab is trapped, Escape and backdrop close it,
 * focus returns to the trigger on close.
 * <Modal open={open} onClose={close} title="Edit user" description="..." footer={<Buttons/>} size="md">body</Modal>
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true, initialFocusRef }) {
  const panel = useRef(null);
  const titleId = useId(), descId = useId();
  const reduce = useReducedMotion();
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const dismissRef = useRef(dismissible); dismissRef.current = dismissible;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const t = setTimeout(() => {
      const el = (initialFocusRef && initialFocusRef.current) || panel.current?.querySelector('input:not([disabled]),textarea,select,button:not([data-close])') || panel.current;
      el && el.focus();
    }, 30);
    const onKey = e => {
      if (e.key === 'Escape' && dismissRef.current) { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey, true); document.body.style.overflow = overflow; prev && prev.focus && prev.focus(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15 }}>
          <div className="absolute inset-0 bg-[#0a0907]/55 backdrop-blur-[2px]" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
            className={cn('relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop outline-none sm:rounded-2xl', SIZES[size])}
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[17px] font-semibold">{title}</h2>
                {description && <p id={descId} className="mt-1 text-[13.5px] text-muted">{description}</p>}
              </div>
              {dismissible && <button type="button" data-close className="icon-btn icon-btn-sm -mr-1.5 -mt-1" onClick={onClose} aria-label="Close dialog"><X aria-hidden="true" /></button>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-subtle/50 px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
