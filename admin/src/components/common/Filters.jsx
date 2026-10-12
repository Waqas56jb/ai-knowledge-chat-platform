import { forwardRef } from 'react';
import { Search, X, FilterX } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

/** Search box with a clear button. */
export const SearchInput = forwardRef(function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', className, ...rest }, ref) {
  return (
    <div className={cn('relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
      <input ref={ref} type="search" className="input h-9 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label} {...rest} />
      {value && <button type="button" className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink" onClick={() => onChange('')} aria-label="Clear search"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
    </div>
  );
});

/**
 * Compact labelled select for filter bars.
 * options: [['value', 'Label'], ...]
 */
export function FilterSelect({ label, value, onChange, options, className }) {
  return (
    <label className={cn('relative', className)}>
      <span className="sr-only">{label}</span>
      <select className="select select-sm" value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Row of filters; shows "Clear filters" when `active` is true. */
export function FilterBar({ children, onClear, active = false, className, right }) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        {active && onClear && <Button variant="ghost" size="sm" icon={FilterX} onClick={onClear}>Clear filters</Button>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
