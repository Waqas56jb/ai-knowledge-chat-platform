import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../utils/format';

/** Footer pagination with rows-per-page. Pass the useServerTable().bind() object as `table`. */
export default function Pagination({ table, sizes = [10, 25, 50], label = 'rows' }) {
  const { page, pageCount, pageSize, total, setPage, setPageSize } = table;
  if (!total) return null;
  const from = (page - 1) * pageSize + 1, to = Math.min(total, page * pageSize);
  const pages = [];
  for (let p = 1; p <= pageCount; p++) if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p); else if (pages[pages.length - 1] !== '…') pages.push('…');
  return (
    <nav className="flex flex-col gap-3 border-t border-line px-4 py-3 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination">
      <div className="flex items-center gap-3">
        <span>Showing <b className="font-semibold text-ink">{formatNumber(from)}–{formatNumber(to)}</b> of <b className="font-semibold text-ink">{formatNumber(total)}</b> {label}</span>
        <label className="hidden items-center gap-2 sm:flex">
          <span>Rows</span>
          <select className="select select-sm h-8 py-0 pl-2" value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Rows per page">
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className="icon-btn icon-btn-sm" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft aria-hidden="true" /></button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1.5" aria-hidden="true">…</span>
          : <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}
              className={`h-8 min-w-8 rounded-lg px-2 font-medium transition ${p === page ? 'bg-ink text-surface' : 'text-muted hover:bg-subtle hover:text-ink'}`}>{p}</button>)}
        <button type="button" className="icon-btn icon-btn-sm" onClick={() => setPage(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ChevronRight aria-hidden="true" /></button>
      </div>
    </nav>
  );
}
