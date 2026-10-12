import { ResponsiveContainer, LineChart, AreaChart, BarChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltip } from '../common/ChartCard';
import { formatCompact } from '../../utils/format';
import { AXIS_PROPS, GRID_PROPS, CURSOR_LINE, CURSOR_BAR, SURFACE, xTickProps } from './chartTheme';

const CHARTS = { line: LineChart, area: AreaChart, bar: BarChart };

/**
 * Time-series chart over `analytics.series` rows (x = `label`).
 * series: [{ key, name, color }]; type: 'line' | 'area' | 'bar'; `stacked` stacks areas/bars.
 */
export default function TimeSeriesChart({ rows, series, type = 'line', stacked = false, ariaLabel }) {
  const Chart = CHARTS[type];
  const last = series.length - 1;
  // Wide enough for the largest tick (compact format: 1.2K), so values are never clipped.
  const max = Math.max(0, ...rows.map(r => (stacked ? series.reduce((n, s) => n + (Number(r[s.key]) || 0), 0) : Math.max(0, ...series.map(s => Number(r[s.key]) || 0)))));
  const yWidth = Math.max(36, formatCompact(max).length * 7.5 + 16);
  return (
    <div className="flex h-full flex-col" role="img" aria-label={ariaLabel}>
      {series.length > 1 && <SeriesLegend series={series} />}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid {...GRID_PROPS} />
            <XAxis {...xTickProps(rows.length)} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={yWidth} tickFormatter={formatCompact} />
            <Tooltip content={<ChartTooltip />} cursor={type === 'bar' ? CURSOR_BAR : CURSOR_LINE} />
            {series.map((s, i) => {
              if (type === 'bar') {
                const top = !stacked || i === last;
                return <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? 'a' : undefined} radius={top ? [4, 4, 0, 0] : 0} maxBarSize={28} stroke={stacked ? SURFACE : undefined} strokeWidth={stacked ? 1 : 0} />;
              }
              if (type === 'area') {
                return <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={stacked ? 0.55 : 0.14} stackId={stacked ? 'a' : undefined} activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }} dot={false} />;
              }
              return <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }} />;
            })}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Compact inline legend for multi-series charts. */
export function SeriesLegend({ series }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[12.5px] text-muted">
      {series.map(s => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />{s.name}
        </li>
      ))}
    </ul>
  );
}
