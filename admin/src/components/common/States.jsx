import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

/** Friendly empty state. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className, compact = false }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary-text"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h3 className="text-[15.5px] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error state with optional retry. */
export function ErrorState({ error, title = 'Something went wrong', onRetry, className }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
      <h3 className="text-[15.5px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13.5px] text-muted">{error ? error.message || String(error) : 'The data could not be loaded.'}</p>
      {onRetry && <Button className="mt-4" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Shimmer placeholder block. */
export function Skeleton({ className, style }) { return <span aria-hidden="true" style={style} className={cn('skeleton block h-4', className)} />; }

/** Placeholder rows for tables. */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          {Array.from({ length: cols - 1 }).map((__, c) => <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-1/4' : 'hidden w-1/6 sm:block')} />)}
        </div>
      ))}
    </div>
  );
}

/** Full-page loading placeholder (cards + table). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="card card-pad space-y-3"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-7 w-20" /></div>)}</div>
      <div className="card"><TableSkeleton /></div>
    </div>
  );
}
