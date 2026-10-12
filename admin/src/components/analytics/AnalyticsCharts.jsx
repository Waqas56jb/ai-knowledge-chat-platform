import { Link, useNavigate } from 'react-router-dom';
import ChartCard from '../common/ChartCard';
import { formatNumber, formatPercent, pluralize } from '../../utils/format';
import TimeSeriesChart from './TimeSeriesChart';
import RankedBarChart from './RankedBarChart';
import { SERIES, OUTCOME_COLORS, processingItems, hasActivity } from './chartTheme';

const footerNote = text => <p className="border-t border-line px-5 py-3 text-[12.5px] text-muted">{text}</p>;

/** User growth, conversation activity and the stacked questions chart. */
export function AnalyticsTrendCharts({ analytics: a, loading }) {
  const empty = !loading && !hasActivity(a);
  const rows = a?.series || [];
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="User growth" description="Total registered users at the end of each day" loading={loading} empty={empty} height={260}
          footer={a && !empty && footerNote(`${pluralize(a.totals.newUsers, 'new registration')} in this period.`)}>
          <TimeSeriesChart rows={rows} type="area" series={[{ key: 'totalUsers', name: 'Total users', color: SERIES.primary }]} ariaLabel="Area chart of total users over time" />
        </ChartCard>
        <ChartCard title="Conversation activity" description="Conversations started per day" loading={loading} empty={empty} height={260}
          footer={a && !empty && footerNote(`${formatNumber(a.totals.conversations)} conversations, ${formatNumber(Math.round(a.totals.conversations / Math.max(1, a.days)))} per day on average.`)}>
          <TimeSeriesChart rows={rows} type="bar" series={[{ key: 'conversations', name: 'Conversations', color: SERIES.ink }]} ariaLabel="Bar chart of conversations per day" />
        </ChartCard>
      </div>
      <ChartCard title="Questions over time" description="Questions by outcome: answered with sources, no supporting evidence, out of scope, or error" loading={loading} empty={empty} height={300}>
        <TimeSeriesChart rows={rows} type={rows.length > 45 ? 'area' : 'bar'} stacked ariaLabel="Stacked chart of questions by outcome over time"
          series={[
            { key: 'answeredWithSources', name: 'Answered with sources', color: OUTCOME_COLORS.answered },
            { key: 'noEvidence', name: 'No supporting evidence', color: OUTCOME_COLORS.insufficient_evidence },
            { key: 'outOfScope', name: 'Out of scope', color: OUTCOME_COLORS.out_of_scope },
            { key: 'failed', name: 'Errors', color: OUTCOME_COLORS.error }
          ]} />
      </ChartCard>
    </>
  );
}

/** Source status across the workspace (not range-filtered). */
export function ProcessingStatusCard({ analytics: a, loading }) {
  const items = a ? processingItems(a).map(i => ({ ...i, name: i.label })) : [];
  return (
    <ChartCard title="Source processing status" description="Current status of every knowledge source" loading={loading} empty={!loading && !items.some(i => i.value)} height={200}
      footer={a && footerNote(`Job success rate ${formatPercent(a.kpis.processingSuccess.value)} (completed vs failed jobs in this period).`)}>
      <RankedBarChart rows={items} dataKey="value" name="Sources" color={SERIES.ink} ariaLabel="Bar chart of knowledge sources by processing status" />
    </ChartCard>
  );
}

/** Most active users by questions asked; bars open the user. */
export function TopUsersCard({ analytics: a, loading }) {
  const navigate = useNavigate();
  const rows = a?.topUsers || [];
  return (
    <ChartCard title="Most active users" description="Questions asked in this period" loading={loading} empty={!loading && !rows.length} height={260}
      emptyTitle="No questions in this period" emptyDescription="Users appear here once they ask the assistant questions."
      footer={rows.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-[12.5px]">
          {rows.map(u => <li key={u.id} className="min-w-0 max-w-full"><Link to={`/admin/users/${u.id}`} className="link break-words">{u.name}</Link></li>)}
        </ul>
      )}>
      <RankedBarChart rows={rows} dataKey="questions" name="Questions" color={SERIES.primary}
        onSelect={u => u?.id && navigate(`/admin/users/${u.id}`)} ariaLabel="Bar chart of the most active users by questions asked" />
    </ChartCard>
  );
}
