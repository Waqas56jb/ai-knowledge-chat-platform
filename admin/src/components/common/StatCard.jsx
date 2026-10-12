import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { Skeleton } from './States';
import Tooltip from './Tooltip';

/**
 * KPI card.
 * <StatCard label="Total users" value={14} delta={12.5} icon={Users} hint="..." invert to="/admin/users" suffix="%" />
 * `delta` is a % change vs the previous period; `invert` makes a decrease the good direction.
 */
export default function StatCard({ label, value, delta, icon: Icon, hint, invert = false, suffix = '', loading = false, to, compareLabel = 'vs previous period', className }) {
  const up = delta > 0, flat = delta === 0 || delta == null;
  const good = flat ? null : invert ? !up : up;
  const Trend = flat ? Minus : up ? TrendingUp : TrendingDown;
  // A unit such as '%' sits right after the number; a longer suffix (e.g. ' · 85%') may wrap below it.
  const tightSuffix = !!suffix && !/^\s/.test(suffix);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {/* Labels wrap instead of being cut off; the info button stays beside the last word. */}
        <p className="min-w-0 text-[13px] font-medium leading-snug text-muted [overflow-wrap:anywhere]">
          {label}
          {hint && (
            <Tooltip label={hint} className="ml-1 align-[-2px]">
              <button type="button" className="text-faint hover:text-muted" aria-label={`About ${label}: ${hint}`}><Info className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </Tooltip>
          )}
        </p>
        {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-subtle text-primary-text"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>}
      </div>
      {loading
        ? <Skeleton className="mt-2 h-8 w-24" />
        : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1 font-display text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">
            <span className="tabular-nums">
              {typeof value === 'number' ? formatNumber(value) : value}
              {tightSuffix && <span className="ml-0.5 text-[16px] text-muted sm:text-[18px]">{suffix}</span>}
            </span>
            {suffix && !tightSuffix && <span className="text-[14px] font-medium text-muted sm:text-[16px]">{suffix.replace(/^\s*·?\s*/, '· ')}</span>}
          </p>
        )}
      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-snug">
        {delta != null ? (
          <>
            <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold', good == null ? 'bg-subtle text-muted' : good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
              <Trend className="h-3.5 w-3.5" aria-hidden="true" />{delta > 0 ? '+' : ''}{delta}%
            </span>
            <span className="text-faint">{compareLabel}</span>
          </>
        ) : <span className="text-faint">{hint ? 'Current total' : ' '}</span>}
      </div>
    </>
  );
  const cls = cn('card card-pad block min-w-0', to && 'transition hover:-translate-y-0.5 hover:border-primary/50 focus-visible:-translate-y-0.5', className);
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
