import { useEffect, useRef, useState } from 'react';

/** Debounce a fast-changing value (search inputs). */
export function useDebounce(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Set the browser tab title for a page. */
export function useDocumentTitle(title) {
  useEffect(() => { document.title = title ? `${title} · NEXUS AI Admin` : 'NEXUS AI Admin'; }, [title]);
}

/** Call `handler` on a mousedown outside `ref` while `active`. */
export function useClickOutside(ref, handler, active = true) {
  const h = useRef(handler); h.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const on = e => { if (ref.current && !ref.current.contains(e.target)) h.current(e); };
    document.addEventListener('mousedown', on);
    document.addEventListener('touchstart', on);
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('touchstart', on); };
  }, [ref, active]);
}

/** Close on Escape while `active`. */
export function useEscape(handler, active = true) {
  const h = useRef(handler); h.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const on = e => { if (e.key === 'Escape') h.current(e); };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, [active]);
}

export function useMediaQuery(query) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query); const on = () => setM(mq.matches);
    on(); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** Copy text to the clipboard; resolves true/false. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e2) { return false; }
  }
}
