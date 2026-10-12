import { useEffect, useRef, useState } from 'react';

/**
 * Dropdown: `trigger` renders the toggle button, children are the menu items.
 * Closes on outside click, on Escape and after any item inside is clicked.
 */
export default function MenuWrap({ trigger, menuClass = '', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger({ 'aria-haspopup': 'true', 'aria-expanded': open, onClick: () => setOpen(o => !o) })}
      <div className={`menu ${menuClass}`} hidden={!open} onClick={e => { if (e.target.closest('button,a')) setOpen(false); }}>{children}</div>
    </div>
  );
}
