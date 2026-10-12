import { cloneElement, useId, useState } from 'react';
import { cn } from '../../utils/cn';

/** Lightweight tooltip shown on hover and keyboard focus. Wraps a single focusable child. */
export default function Tooltip({ label, side = 'top', children, disabled = false, className }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (disabled || !label) return children;
  const pos = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2'
  }[side];
  return (
    <span className={cn('relative inline-flex', className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open && (
        <span role="tooltip" id={id} className={cn('pointer-events-none absolute z-50 w-max max-w-[min(18rem,80vw)] whitespace-normal break-words rounded-md bg-[#15130f] px-2 py-1 text-[12px] font-medium text-[#f4efe6] shadow-pop animate-fade-in dark:bg-[#f4efe6] dark:text-[#15130f]', pos)}>
          {label}
        </span>
      )}
    </span>
  );
}
