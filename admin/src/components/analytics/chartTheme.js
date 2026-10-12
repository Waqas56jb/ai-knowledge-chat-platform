import { CHART_COLORS, AXIS } from '../common/ChartCard';

/* Shared Recharts presets for the dashboard and analytics pages. All colours are CSS-variable based, so dark mode works. */

/** Axis props with theme-aware tick colour. */
export const AXIS_PROPS = { ...AXIS, tick: { ...AXIS.tick, fill: 'rgb(var(--faint))' } };
export const GRID_PROPS = { stroke: 'rgb(var(--chart-grid))', strokeDasharray: '3 3', vertical: false };
export const CURSOR_LINE = { stroke: 'rgb(var(--line))', strokeWidth: 1 };
export const CURSOR_BAR = { fill: 'rgb(var(--subtle))' };
export const SURFACE = 'rgb(var(--surface))';

/** Named series colours (fixed per entity, never by rank). */
export const SERIES = {
  primary: CHART_COLORS[0],
  ink: CHART_COLORS[1],
  green: CHART_COLORS[2],
  violet: CHART_COLORS[3],
  red: CHART_COLORS[4]
};

/** Query-outcome colours: keys match analytics.outcomes[].key. */
export const OUTCOME_COLORS = { answered: SERIES.green, insufficient_evidence: SERIES.primary, out_of_scope: SERIES.violet, error: SERIES.red };

/** Knowledge-source groups get the categorical order. */
export const groupColor = i => CHART_COLORS[i % CHART_COLORS.length];

/** Processing status colours: keys match analytics.processing[].key. */
export const PROCESSING_COLORS = { indexed: SERIES.green, processing: SERIES.primary, pending: SERIES.violet, failed: SERIES.red, disabled: SERIES.ink };

/** X-axis props that keep tick labels readable for long (90-day / custom) ranges. */
export function xTickProps(count) {
  return { ...AXIS_PROPS, dataKey: 'label', minTickGap: 18, interval: count > 45 ? Math.ceil(count / 9) - 1 : count > 20 ? 'preserveStartEnd' : 0 };
}

export const sumValues = items => items.reduce((n, i) => n + (i.value || 0), 0);

/** Donut items for knowledge-source groups. */
export const sourceItems = a => a.sourceDistribution.map((s, i) => ({ key: s.key, label: s.label, value: s.value, color: groupColor(i) }));
/** Donut / bar items for query outcomes. */
export const outcomeItems = a => a.outcomes.map(o => ({ key: o.key, label: o.label, value: o.value, color: OUTCOME_COLORS[o.key] || SERIES.ink }));
/** Items for source-processing status. */
export const processingItems = a => a.processing.map(p => ({ key: p.key, label: p.label, value: p.value, color: PROCESSING_COLORS[p.key] || SERIES.ink }));
/** True when the selected range has no recorded activity at all. */
export const hasActivity = a => !!a && a.series.some(r => r.activeUsers || r.conversations || r.questions || r.newUsers);
