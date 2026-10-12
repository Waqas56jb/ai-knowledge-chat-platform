import { Children, cloneElement, forwardRef, isValidElement, useId } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Card, CardHeader } from '../common/Card';
import Button from '../common/Button';
import { ErrorState, Skeleton } from '../common/States';

/* Label column + control column on wide screens, stacked on narrow ones. The settings nav takes a
   column from lg, so rows stack again between lg and xl to keep controls a usable width. */
const ROW = 'grid gap-2.5 px-5 py-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8 lg:grid-cols-1 lg:gap-2.5 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-8';

/**
 * Settings section form card.
 * <SettingsFormCard state={useSettingsForm(...)} icon title description notice>rows</SettingsFormCard>
 */
export function SettingsFormCard({ state, icon, title, description, notice, children }) {
  const { form, loading, error, reload, save, cancel, resetToDefaults, resetting } = state;
  const { isDirty, isSubmitting } = form.formState;
  if (error) return <Card><ErrorState error={error} onRetry={reload} title="Settings could not be loaded" /></Card>;
  return (
    <Card as="form" onSubmit={save} noValidate aria-busy={loading || undefined}>
      <CardHeader icon={icon} title={title} description={description} />
      {notice && <div className="border-b border-line px-5 py-4">{notice}</div>}
      {loading ? <RowsSkeleton /> : <div className="divide-y divide-line">{children}</div>}
      <div className="flex flex-col-reverse gap-3 rounded-b-2xl border-t border-line bg-subtle/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        {resetToDefaults ? <Button variant="danger-ghost" size="sm" icon={RotateCcw} onClick={resetToDefaults} loading={resetting} disabled={loading || isSubmitting} className="self-start sm:self-auto">Reset to defaults</Button> : <span />}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={cn('mr-1 text-[12.5px]', isDirty ? 'font-medium text-warning' : 'text-faint')} aria-live="polite">{loading ? '' : isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <Button onClick={cancel} disabled={!isDirty || isSubmitting}>Cancel</Button>
          <Button type="submit" variant="primary" icon={Save} loading={isSubmitting} disabled={!isDirty || loading}>{isSubmitting ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </div>
    </Card>
  );
}

function RowsSkeleton() {
  return (
    <div className="divide-y divide-line" aria-label="Loading settings">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={ROW}>
          <div className="space-y-2"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-40" /></div>
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * One setting: label + description on the left, control (+ help/error) on the right.
 * A single control child receives id / aria-invalid / aria-describedby. Use `group` for radio or
 * checkbox sets: the label then names a role="group" wrapper instead of a single control.
 */
export function SettingRow({ label, description, help, error, children, group = false, required = false, id: idProp }) {
  const auto = useId();
  const id = idProp || `set-${auto.replace(/:/g, '')}`;
  const describedBy = [description && `${id}-desc`, help && !error && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const only = Children.count(children) === 1 && isValidElement(children) && typeof children.type !== 'string' ? children : null;
  const control = !group && only ? cloneElement(only, { id, 'aria-invalid': error ? 'true' : 'false', 'aria-describedby': describedBy }) : children;
  const labelText = <>{label}{required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</>;
  return (
    <div className={ROW}>
      <div className="min-w-0">
        {group
          ? <p id={`${id}-label`} className="text-[13.5px] font-medium text-ink">{labelText}</p>
          : <label htmlFor={id} className="text-[13.5px] font-medium text-ink">{labelText}</label>}
        {description && <p id={`${id}-desc`} className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
      </div>
      <div className="min-w-0">
        {group ? <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>{children}</div> : control}
        {help && !error && <p id={`${id}-help`} className="field-help">{help}</p>}
        {error && <p id={`${id}-err`} className="field-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

/** Full-width row for a Switch (the switch carries its own label and description). */
export function SwitchRow({ children }) {
  return <div className="px-5 py-4">{children}</div>;
}

/** Text/number input with an optional unit suffix ("days", "MB"). Forwards id/aria props to the input. */
export const UnitInput = forwardRef(function UnitInput({ suffix, className, ...rest }, ref) {
  return (
    <div className={cn('relative w-full max-w-[220px]', className)}>
      <input ref={ref} className={cn('input tabular-nums', suffix && 'pr-16')} {...rest} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint" aria-hidden="true">{suffix}</span>}
    </div>
  );
});

/**
 * Accessible option cards backed by native radios (arrow keys work).
 * options: [{ value, label, description?, icon?, preview? }]
 */
export function RadioCards({ name, value, onChange, options, columns = 3, className }) {
  return (
    <div className={cn('grid gap-3', columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : '', className)}>
      {options.map(o => {
        const checked = value === o.value;
        const Icon = o.icon;
        return (
          <label key={o.value} className={cn('relative flex cursor-pointer flex-col rounded-xl border p-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/25',
            checked ? 'border-primary bg-primary-soft/40 shadow-card' : 'border-line bg-surface hover:border-primary/40')}>
            <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
            {o.preview && <span className="mb-3 block" aria-hidden="true">{o.preview}</span>}
            <span className="flex items-start gap-2.5">
              {Icon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', checked ? 'text-primary-text' : 'text-muted')} aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-ink">{o.label}</span>
                {o.description && <span className="block text-[12.5px] text-muted">{o.description}</span>}
              </span>
              <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', checked ? 'border-primary-strong' : 'border-line')} aria-hidden="true">
                {checked && <span className="h-1.5 w-1.5 rounded-full bg-primary-strong" />}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
