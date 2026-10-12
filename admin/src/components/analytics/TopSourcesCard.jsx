import { Link } from 'react-router-dom';
import { CardHeader } from '../common/Card';
import { SourceTypeIcon } from '../common/Misc';
import { Skeleton, EmptyState } from '../common/States';
import { formatNumber } from '../../utils/format';
import { BookOpen } from 'lucide-react';

/** Ranked list of the most cited knowledge sources, each linking to the source. */
export default function TopSourcesCard({ sources, loading }) {
  const rows = sources || [];
  const max = Math.max(1, ...rows.map(s => s.citations));
  return (
    <section className="card flex min-w-0 flex-col">
      <CardHeader title="Most referenced sources" description="Citations in answers during this period" />
      {loading ? (
        <div className="space-y-4 p-5" aria-busy="true" aria-label="Loading sources">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState compact icon={BookOpen} title="No citations yet" description="Sources appear here once answers cite them." />
      ) : (
        <ol className="flex-1 space-y-1 p-3">
          {rows.map((s, i) => {
            const body = (
              <>
                <span className="w-5 shrink-0 text-right text-[12.5px] font-semibold text-faint">{i + 1}</span>
                <SourceTypeIcon type={s.type} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{s.title}</span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(s.citations / max) * 100}%` }} />
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-muted"><b className="font-semibold text-ink">{formatNumber(s.citations)}</b><span className="sr-only"> {s.citations === 1 ? 'citation' : 'citations'}</span></span>
              </>
            );
            return (
              <li key={s.id}>
                {s.type
                  ? <Link to={`/admin/knowledge/${s.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-subtle">{body}</Link>
                  : <div className="flex items-center gap-3 px-2 py-2 opacity-70">{body}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
