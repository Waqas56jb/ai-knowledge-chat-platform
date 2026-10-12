import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltip } from '../common/ChartCard';
import { AXIS_PROPS, CURSOR_BAR } from './chartTheme';

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Horizontal ranked bars.
 * rows: [{ [nameKey], [dataKey], color? }] — a row's `color` overrides `color`.
 * `onSelect(row)` makes bars clickable (mouse only; always pair it with an accessible link list elsewhere).
 */
export default function RankedBarChart({ rows, dataKey, nameKey = 'name', name, color, onSelect, ariaLabel, labelWidth = 110 }) {
  return (
    <div className="h-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="rgb(var(--chart-grid))" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey={nameKey} {...AXIS_PROPS} width={labelWidth} interval={0} tickFormatter={v => truncate(String(v), Math.floor(labelWidth / 7))} />
          <Tooltip content={<ChartTooltip />} cursor={CURSOR_BAR} />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22}
            onClick={onSelect ? d => onSelect(d.payload || d) : undefined} className={onSelect ? 'cursor-pointer' : undefined}>
            {rows.map((r, i) => <Cell key={r.key || r.id || i} fill={r.color || color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
