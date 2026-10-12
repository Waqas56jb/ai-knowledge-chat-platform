import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChartTooltip, ChartLegend } from '../common/ChartCard';
import { formatNumber } from '../../utils/format';
import { useElementWidth } from '../../hooks/useMisc';
import { cn } from '../../utils/cn';
import { SURFACE, sumValues } from './chartTheme';

/** Below this card width the legend goes under the donut, so labels keep their full width. */
const SIDE_BY_SIDE_MIN = 440;

/**
 * Donut with a centre total and a legend beside it — or below it when the card is narrow (decided by the
 * card's own width, not the viewport, because the dashboard puts three cards in a row). Use it in a
 * `<ChartCard height="auto">` so a wrapping legend is never cut off.
 * items: [{ key, label, value, color }]
 */
export default function DonutChart({ items, centerLabel = 'Total', ariaLabel }) {
  const [ref, width] = useElementWidth();
  const wide = width >= SIDE_BY_SIDE_MIN;
  const total = sumValues(items);
  const data = items.filter(i => i.value > 0).map(i => ({ ...i, fill: i.color }));
  return (
    <div ref={ref} className={cn('flex min-w-0 gap-4', wide ? 'flex-row items-center gap-6' : 'flex-col items-center')} role="img" aria-label={ariaLabel}>
      <div className={cn('relative shrink-0', wide ? 'h-[180px] w-[180px]' : 'h-[150px] w-[150px]')}>
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
