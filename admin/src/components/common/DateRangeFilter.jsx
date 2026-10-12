import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { DATE_RANGES } from '../../constants/domain';
import { formatInputDate } from '../../utils/format';
import { Segmented } from './Tabs';
import Button from './Button';

/**
 * Preset range picker with an optional custom range.
 * value: 'today' | '7d' | '30d' | '90d' | { from: 'yyyy-mm-dd', to: 'yyyy-mm-dd' }
 * <DateRangeFilter value={range} onChange={setRange} presets={['7d','30d','90d']} allowCustom bounds={{min,max}} />
 */
export default function DateRangeFilter({ value, onChange, presets = ['today', '7d', '30d', '90d'], allowCustom = false, bounds }) {
  const isCustom = typeof value === 'object' && value !== null;
  const [open, setOpen] = useState(isCustom);
  const [from, setFrom] = useState(isCustom ? value.from : formatInputDate(Date.now() - 13 * 864e5));
  const [to, setTo] = useState(isCustom ? value.to : formatInputDate(Date.now()));
  const [err, setErr] = useState('');
  const options = DATE_RANGES.filter(([v]) => presets.includes(v));
  if (allowCustom) options.push(['custom', 'Custom']);

  const apply = () => {
    if (!from || !to) { setErr('Choose both dates.'); return; }
    if (from > to) { setErr('The start date must be before the end date.'); return; }
    setErr(''); onChange({ from, to });
  };
  const min = bounds ? formatInputDate(bounds.min) : undefined, max = bounds ? formatInputDate(bounds.max) : formatInputDate(Date.now());

  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-2 sm:items-end">
      <Segmented label="Date range" options={options} value={isCustom || open ? 'custom' : value}
        onChange={v => { if (v === 'custom') setOpen(true); else { setOpen(false); onChange(v); } }} />
      {allowCustom && open && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-muted">From<input type="date" className="input mt-1 h-9 w-[150px]" value={from} min={min} max={max} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-[12px] text-muted">To<input type="date" className="input mt-1 h-9 w-[150px]" value={to} min={min} max={max} onChange={e => setTo(e.target.value)} /></label>
          <Button size="sm" variant="primary" icon={CalendarRange} onClick={apply} className="h-9">Apply</Button>
          {err && <p className="field-error w-full text-right" role="alert">{err}</p>}
        </div>
      )}
    </div>
  );
}
