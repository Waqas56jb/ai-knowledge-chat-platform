import { cn } from '../../utils/cn';

/** Surface container. `padded` adds the standard inner padding. */
export function Card({ as: As = 'section', className, padded = false, children, ...rest }) {
  return <As className={cn('card', padded && 'card-pad', className)} {...rest}>{children}</As>;
}

/** Card header row: title (+ optional description) on the left, actions on the right. */
export function CardHeader({ title, description, actions, icon: Icon, className }) {
  return (
    <div className={cn('card-header', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-text"><Icon className="h-4 w-4" aria-hidden="true" /></span>}
        <div className="min-w-0">
          <h2 className="card-title break-words">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Definition list for "label: value" details. items: [[label, value], ...] (falsy entries are skipped). */
export function DescriptionList({ items, className, columns = 1 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 text-[13.5px]', columns === 2 && 'sm:grid-cols-2', className)}>
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[12px] font-medium uppercase tracking-wide text-faint">{label}</dt>
          <dd className="mt-0.5 break-words text-ink">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
