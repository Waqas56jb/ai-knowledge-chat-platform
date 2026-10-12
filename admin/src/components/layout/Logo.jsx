import { useId } from 'react';

/** NEXUS gold mark. Each instance gets a unique gradient id. */
export function LogoMark({ size = 30 }) {
  const g = 'lg' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3dcaa" /><stop offset=".55" stopColor="#d9b676" /><stop offset="1" stopColor="#a8823f" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill={`url(#${g})`} />
      <path d="M10 22V10l12 12V10" fill="none" stroke="#15120c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.3" fill="#15120c" /><circle cx="22" cy="22" r="2.3" fill="#15120c" />
    </svg>
  );
}

/** Logo + wordmark. `tone="light"` for dark backgrounds. */
export default function Logo({ size = 30, collapsed = false, tone = 'light', sub = 'Admin' }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {!collapsed && (
        <span className="leading-none">
          <span className={`block font-display text-[15.5px] font-bold tracking-[0.12em] ${tone === 'light' ? 'text-sidebar-text' : 'text-ink'}`}>NEXUS <span className="text-primary">AI</span></span>
          {sub && <span className={`mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.2em] ${tone === 'light' ? 'text-sidebar-muted' : 'text-faint'}`}>{sub}</span>}
        </span>
      )}
    </span>
  );
}
