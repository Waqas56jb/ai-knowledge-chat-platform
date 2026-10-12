import { useId, useRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Accessible tabs (arrow-key navigation). Render the active panel yourself:
 *   <Tabs tabs={[{ id: 'overview', label: 'Overview', count: 3 }]} value={tab} onChange={setTab} />
 *   <TabPanel id="overview" value={tab}>…</TabPanel>
 */
export function Tabs({ tabs, value, onChange, className, idPrefix }) {
  const auto = useId(); const pre = idPrefix || auto;
  const refs = useRef({});
  const onKey = (e, i) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.id); refs.current[next.id]?.focus();
  };
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button key={t.id} ref={el => { refs.current[t.id] = el; }} role="tab" type="button" id={`${pre}-tab-${t.id}`} aria-controls={`${pre}-panel-${t.id}`}
            aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={e => onKey(e, i)}
            className={cn('relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition',
              active ? 'border-primary-strong text-ink' : 'border-transparent text-muted hover:text-ink')}>
            {t.icon && <t.icon className="h-4 w-4" aria-hidden="true" />}{t.label}
            {t.count != null && <span className={cn('rounded-full px-1.5 text-[11.5px] font-semibold', active ? 'bg-primary-soft text-primary-text' : 'bg-subtle text-muted')}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, value, children, idPrefix, className }) {
  if (id !== value) return null;
  return <div role="tabpanel" id={idPrefix ? `${idPrefix}-panel-${id}` : undefined} tabIndex={0} className={cn('outline-none', className)}>{children}</div>;
}

/** Segmented control (pill buttons) — for small option sets like date ranges or themes. */
export function Segmented({ options, value, onChange, label, size = 'md', className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-subtle p-0.5', className)}>
      {options.map(([v, l, Icon]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition', size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3 py-1.5 text-[13px]',
            value === v ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink')}>
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{l}
        </button>
      ))}
    </div>
  );
}
