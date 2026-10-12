import ChartCard from '../common/ChartCard';
import TimeSeriesChart from '../analytics/TimeSeriesChart';
import DonutChart from '../analytics/DonutChart';
import { SERIES, sourceItems, outcomeItems, hasActivity } from '../analytics/chartTheme';

const rangeText = days => (days === 1 ? 'today, by hour' : `the last ${days} days`);

/** Activity and conversation trends (two columns on wide screens). */
export function DashboardTrendCharts({ analytics, loading }) {
  const empty = !loading && !hasActivity(analytics);
  const rows = analytics?.series || [];
  const period = analytics ? rangeText(analytics.days) : '';
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="User activity" description={`Active users over ${period}`} loading={loading} empty={empty} height={260}>
        <TimeSeriesChart rows={rows} type="line" series={[{ key: 'activeUsers', name: 'Active users', color: SERIES.primary }]} ariaLabel="Line chart of active users over the selected period" />
      </ChartCard>
      <ChartCard title="Conversation volume" description={`Conversations started over ${period}`} loading={loading} empty={empty} height={260}>
        <TimeSeriesChart rows={rows} type="bar" series={[{ key: 'conversations', name: 'Conversations', color: SERIES.ink }]} ariaLabel="Bar chart of conversation volume over the selected period" />
      </ChartCard>
    </div>
  );
}

/** Knowledge-source distribution donut. */
export function SourceDistributionCard({ analytics, loading }) {
  const items = analytics ? sourceItems(analytics) : [];
  return (
    <ChartCard title="Knowledge-source distribution" description="Sources in the workspace by type" loading={loading} empty={!loading && !items.some(i => i.value)} height="auto"
      emptyTitle="No knowledge sources yet" emptyDescription="Add a video, document or text source to see the mix here.">
      <DonutChart items={items} centerLabel="Sources" ariaLabel="Donut chart of knowledge sources by type" />
    </ChartCard>
  );
}

/** Answered / no evidence / out of scope / error split for the selected period. */
export function QueryOutcomeCard({ analytics, loading }) {
  const items = analytics ? outcomeItems(analytics) : [];
  return (
    <ChartCard title="Query outcomes" description="How questions were resolved in this period" loading={loading} empty={!loading && !items.some(i => i.value)} height="auto"
      emptyTitle="No questions in this period" emptyDescription="Outcomes appear once users ask the assistant questions.">
      <DonutChart items={items} centerLabel="Questions" ariaLabel="Donut chart of query outcomes" />
    </ChartCard>
  );
}
