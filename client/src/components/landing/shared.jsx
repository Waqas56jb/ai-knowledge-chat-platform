/** Scroll to a landing section, accounting for the fixed nav. */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
}

/** In-page link that scrolls instead of changing the URL. */
export function SectionLink({ to, className, children, onClick, ...rest }) {
  return <a href={`#${to}`} className={className} onClick={e => { e.preventDefault(); onClick && onClick(); scrollToSection(to); }} {...rest}>{children}</a>;
}

export function LpLogo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: 'none' }}>
      <defs><linearGradient id="lpg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3dcaa" /><stop offset=".55" stopColor="#d9b676" /><stop offset="1" stopColor="#a8823f" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill="url(#lpg)" />
      <path d="M10 22V10l12 12V10" fill="none" stroke="#15120c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.3" fill="#15120c" /><circle cx="22" cy="22" r="2.3" fill="#15120c" />
    </svg>
  );
}

/** Small brand avatar used inside the chat previews. */
export function LpAvatar({ size, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" style={size ? { flex: 'none' } : undefined}>
      <rect width="32" height="32" rx="9" fill="url(#lpg)" />
      <path d="M10 22V10l12 12V10" fill="none" stroke="#15120c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const NAV_LINKS = [['features', 'Features'], ['how', 'How it works'], ['sources', 'Sources'], ['evidence', 'Evidence'], ['faq', 'FAQ']];
