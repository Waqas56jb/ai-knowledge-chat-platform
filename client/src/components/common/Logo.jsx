import { useId } from 'react';

/* DTS mark: a "D" monogram holding a small drop (diabetic testing). Shared with the landing logo and favicon. */
export const D_PATH = 'M10 8.5v15h5.5a7.5 7.5 0 0 0 0-15z';
export const DROP_PATH = 'M16.4 11.6c1.7 2.3 2.7 3.8 2.7 5.1a2.7 2.7 0 0 1-5.4 0c0-1.3 1-2.8 2.7-5.1z';

/** Gold brand mark. Each instance gets its own gradient id, so a copy inside a hidden panel never breaks the others. */
export default function Logo({ size = 28 }) {
  const g = 'lg' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: 'none' }}>
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3dcaa" /><stop offset=".55" stopColor="#d9b676" /><stop offset="1" stopColor="#a8823f" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill={`url(#${g})`} />
      <path d={D_PATH} fill="none" stroke="#15120c" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={DROP_PATH} fill="#15120c" />
    </svg>
  );
}

/** Brand link content: logo + "DTS AI" wordmark. */
export function BrandMark({ size = 30 }) {
  return <><Logo size={size} /><span>DTS <em>AI</em></span></>;
}
