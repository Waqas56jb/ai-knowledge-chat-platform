import { useId } from 'react';

/** Gold brand mark. Each instance gets its own gradient id, so a copy inside a hidden panel never breaks the others. */
export default function Logo({ size = 28 }) {
  const g = 'lg' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: 'none' }}>
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3dcaa" /><stop offset=".55" stopColor="#d9b676" /><stop offset="1" stopColor="#a8823f" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill={`url(#${g})`} />
      <path d="M10 22V10l12 12V10" fill="none" stroke="#15120c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.3" fill="#15120c" /><circle cx="22" cy="22" r="2.3" fill="#15120c" />
    </svg>
  );
}

/** Brand link content: logo + "NEXUS AI" wordmark. */
export function BrandMark({ size = 30 }) {
  return <><Logo size={size} /><span>NEXUS <em>AI</em></span></>;
}
