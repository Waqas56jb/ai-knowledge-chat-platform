import { BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { CardHeader } from './Card';
import { EmptyState, Skeleton } from './States';

/** Theme-aware chart colours (read from CSS variables). */
export const CHART_COLORS = ['rgb(var(--chart-1))', 'rgb(var(--chart-2))', 'rgb(var(--chart-3))', 'rgb(var(--chart-4))', 'rgb(var(--chart-5))'];
export const AXIS = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: 'rgb(var(--faint))' } };

/**
 * Card wrapper for a Recharts chart.
 * <ChartCard title="User activity" description="..." height={260} loading={!data} empty={!rows.length}>{chart}</ChartCard>
 */
export default function ChartCard({ title, description, actions, children, height = 260, loading = false, empty = false, emptyTitle = 'No data for this period', emptyDescription = 'Activity appears here as people use the workspace. Try a longer date range.', className, footer }) {
  return (
    <section className={cn('card flex min-w-0 flex-col', className)}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className="min-w-0 flex-1 px-3 pb-4 pt-4 sm:px-5" style={{ minHeight: height }}>
        {loading ? <Skeleton className="w-full" style={{ height }} /> : empty ? <EmptyState icon={BarChart3} compact title={emptyTitle} description={emptyDescription} /> : <div style={{ height }} className="w-full">{children}</div>}
      </div>
      {footer}
    </section>
  );
}

/** Tooltip content styled to match the design system. Use as <Tooltip content={<ChartTooltip />} />. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-pop">
      {label != null && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}</span><b className="ml-auto pl-3 font-semibold text-ink">{formatter ? formatter(p.value) : formatNumber(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

/** Legend rows for donut charts: [{ label, value, color }]. */
export function ChartLegend({ items, total }) {
  const sum = total ?? items.reduce((n, i) => n + i.value, 0);
  return (
    <ul className="space-y-2 text-[13px]">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: i.color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-muted">{i.label}</span>
          <b className="font-semibold text-ink">{formatNumber(i.value)}</b>
          <span className="w-11 text-right text-faint">{sum ? Math.round((i.value / sum) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}
