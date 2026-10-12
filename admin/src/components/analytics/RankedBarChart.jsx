import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartTooltip } from '../common/ChartCard';
import { useElementWidth } from '../../hooks/useMisc';
import { AXIS_PROPS, CURSOR_BAR } from './chartTheme';

const CHAR_PX = 6.6; // average width of a 12px tick character
const LINE_PX = 14;

/**
 * Split a label into at most `maxLines` lines of about `perLine` characters, breaking at spaces.
 * Only text that still does not fit is cut, with an ellipsis. → { lines, cut }
 */
export function wrapLabel(text, perLine, maxLines = 2) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  let i = 0;
  for (; i < words.length; i++) {
    let w = words[i];
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length <= perLine) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; if (lines.length === maxLines) break; }
    // a single word longer than a line: hard-split it
    while (w.length > perLine && lines.length < maxLines - 1) { lines.push(w.slice(0, perLine)); w = w.slice(perLine); }
    line = w;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const cut = i < words.length || lines.some(l => l.length > perLine);
  if (cut) {
    const last = lines[lines.length - 1] || '';
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, perLine - 1)).trimEnd()}…`;
  }
  return { lines, cut };
}

/** Y-axis tick that wraps to two lines; the full name is in an SVG <title> (native tooltip) when cut. */
function WrappedTick({ x, y, payload, width, onSelect, rows, nameKey }) {
  const full = String(payload?.value ?? '');
  const { lines, cut } = wrapLabel(full, Math.max(6, Math.floor((width - 8) / CHAR_PX)));
  const row = onSelect && rows ? rows.find(r => String(r[nameKey]) === full) : null;
  const top = y - ((lines.length - 1) * LINE_PX) / 2;
  return (
    <g transform={`translate(${x},${top})`} className={row ? 'cursor-pointer' : undefined} onClick={row ? () => onSelect(row) : undefined}>
      <title>{full}</title>
      <text textAnchor="end" fontSize={12} fill="rgb(var(--muted))" dy="0.355em" aria-label={cut ? full : undefined}>
        {lines.map((l, i) => <tspan key={i} x={-6} dy={i === 0 ? 0 : LINE_PX}>{l}</tspan>)}
      </text>
    </g>
  );
}

/**
 * Horizontal ranked bars.
 * rows: [{ [nameKey], [dataKey], color? }] — a row's `color` overrides `color`.
 * `onSelect(row)` makes bars clickable (mouse only; always pair it with an accessible link list elsewhere).
 * Category labels get up to `maxLabelWidth` px (and at most 45% of the chart), wrap to two lines, and are
 * only cut when they still do not fit.
 */
export default function RankedBarChart({ rows, dataKey, nameKey = 'name', name, color, onSelect, ariaLabel, maxLabelWidth = 200, minLabelWidth = 72 }) {
  const [ref, width] = useElementWidth();
  const longest = Math.max(0, ...rows.map(r => String(r[nameKey] ?? '').length));
  // Two lines are allowed, so a label needs about half its length per line (plus a little slack for word breaks).
  const wanted = Math.ceil((longest > 16 ? longest / 2 + 4 : longest) * CHAR_PX) + 12;
  const cap = width ? Math.min(maxLabelWidth, Math.round(width * 0.45)) : maxLabelWidth;
  const labelWidth = Math.max(minLabelWidth, Math.min(wanted, cap));
  return (
    <div ref={ref} className="h-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid stroke="rgb(var(--chart-grid))" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey={nameKey} {...AXIS_PROPS} width={labelWidth} interval={0}
            tick={<WrappedTick width={labelWidth} onSelect={onSelect} rows={rows} nameKey={nameKey} />} />
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
