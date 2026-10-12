import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbLabels } from '../../hooks/useBreadcrumbs';
import { SEGMENT_LABELS } from './navigation';

/** Builds crumbs from the URL; detail pages name their id segment via useBreadcrumb(). */
export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const labels = useBreadcrumbLabels();
  const parts = pathname.split('/').filter(Boolean).slice(1); // drop "admin"
  const crumbs = parts.map((p, i) => ({ to: '/admin/' + parts.slice(0, i + 1).join('/'), label: labels[p] || (parts[i - 1] === 'settings' && p === 'knowledge' ? 'Knowledge' : SEGMENT_LABELS[p]) || p }));
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <li className="shrink-0"><Link to="/admin/dashboard" className="grid h-6 w-6 place-items-center rounded text-faint hover:text-ink" aria-label="Dashboard"><Home className="h-3.5 w-3.5" aria-hidden="true" /></Link></li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.to} className={`flex min-w-0 items-center gap-1.5 ${!last ? 'hidden sm:flex' : ''}`}>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
              {last ? <span aria-current="page" className="truncate font-semibold text-ink">{c.label}</span> : <Link to={c.to} className="truncate text-muted hover:text-ink">{c.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
