import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartTooltip, ChartLegend } from '../common/ChartCard';
import { formatNumber } from '../../utils/format';
import { useMediaQuery } from '../../hooks/useMisc';
import { SURFACE, sumValues } from './chartTheme';

/**
 * Donut with a centre total and a legend beside it (stacked on small screens).
 * items: [{ key, label, value, color }]
 */
export default function DonutChart({ items, centerLabel = 'Total', ariaLabel }) {
  const total = sumValues(items);
  const data = items.filter(i => i.value > 0).map(i => ({ ...i, fill: i.color }));
  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row sm:gap-6" role="img" aria-label={ariaLabel}>
      <div className="relative h-[150px] w-[150px] shrink-0 sm:h-[180px] sm:w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} stroke={SURFACE} strokeWidth={2} isAnimationActive={false}>
              {data.map(i => <Cell key={i.key} fill={i.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-[22px] font-semibold leading-none text-ink">{formatNumber(total)}</p>
            <p className="mt-1 text-[11.5px] uppercase tracking-wide text-faint">{centerLabel}</p>
          </div>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1">
        <ChartLegend items={items} total={total} />
      </div>
    </div>
  );
}

/** ChartCard height for a donut: side-by-side from `sm`, stacked (donut above legend) on phones. */
export function useDonutHeight(itemCount) {
  const wide = useMediaQuery('(min-width: 640px)');
  return wide ? 200 : 166 + itemCount * 30;
}
