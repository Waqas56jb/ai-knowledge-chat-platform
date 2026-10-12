import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import { ErrorState } from '../../components/common/States';
import DashboardKpis from '../../components/dashboard/DashboardKpis';
import { DashboardTrendCharts, SourceDistributionCard, QueryOutcomeCard } from '../../components/dashboard/DashboardCharts';
import NeedsAttentionCard from '../../components/dashboard/NeedsAttentionCard';
import RecentActivityCard from '../../components/dashboard/RecentActivityCard';
import RecentUsersCard from '../../components/dashboard/RecentUsersCard';
import SystemStatusCard from '../../components/dashboard/SystemStatusCard';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { getAnalytics } from '../../services/analyticsService';
import { getAuditLogs } from '../../services/auditService';
import { getUsers, getUserStats } from '../../services/userService';
import { getJobs, getJobStats } from '../../services/processingService';
import { getConversations } from '../../services/conversationService';
import { getInvitationStats } from '../../services/invitationService';
import { getReadiness } from '../../services/healthService';
import { getContentGapStats } from '../../services/contentGapService';

/**
 * Operational counts for the "Needs attention" card: failed jobs (/admin/processing?status=failed),
 * conversations flagged for review (/admin/conversations?review=flagged), open unanswered questions
 * (/admin/content-gaps), pending invitations and suspended users.
 */
async function getOpsStats() {
  const [failed, flagged, invitations, users, jobs, gaps] = await Promise.all([
    getJobs({ status: 'failed', pageSize: 1 }), getConversations({ review: 'flagged', pageSize: 1 }), getInvitationStats(), getUserStats(), getJobStats(), getContentGapStats()
  ]);
  return { jobs, failedJobs: failed.meta.total ?? 0, needsReview: flagged.meta.total ?? 0, pendingInvitations: invitations.pending, suspendedUsers: users.suspended, openGaps: gaps.open };
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const [range, setRange] = useState('7d');
  const rangeKey = JSON.stringify(range);

  const analytics = useQuery(() => getAnalytics(range), [rangeKey]);
  const audit = useQuery(() => getAuditLogs({ pageSize: 8 }), []);
  const users = useQuery(() => getUsers({ sort: 'createdAt', dir: 'desc', pageSize: 5 }), []);
  const ops = useQuery(getOpsStats, [], { refetchInterval: 60000 });
  const health = useQuery(getReadiness, [], { refetchInterval: 60000 });

  const a = analytics.data;
  const chartsLoading = analytics.loading || !a;

  return (
    <>
      <PageHeader
        title="Platform" accent="Overview"
        description="Monitor your knowledge workspace, user activity, and AI operations."
        actions={<DateRangeFilter value={range} onChange={setRange} presets={['today', '7d', '30d', '90d']} />}
      />

      <div className="space-y-6">
        {analytics.error ? (
          <Card><ErrorState title="Metrics could not be loaded" error={analytics.error} onRetry={analytics.reload} /></Card>
        ) : (
          <>
            <DashboardKpis kpis={a?.kpis} loading={chartsLoading} />
            <DashboardTrendCharts analytics={a} loading={chartsLoading} />
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {!analytics.error && (
            <>
              <SourceDistributionCard analytics={a} loading={chartsLoading} />
              <QueryOutcomeCard analytics={a} loading={chartsLoading} />
            </>
          )}
          <div className={analytics.error ? 'flex flex-col' : 'flex flex-col lg:col-span-2 xl:col-span-1'}>
            {ops.error
              ? <Card><ErrorState title="Counts could not be loaded" error={ops.error} onRetry={ops.reload} /></Card>
              : <NeedsAttentionCard stats={ops.data} loading={ops.loading} />}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="min-w-0 space-y-6 xl:col-span-2">
            {users.error
              ? <Card><ErrorState title="Users could not be loaded" error={users.error} onRetry={users.reload} /></Card>
              : <RecentUsersCard users={users.data?.rows} loading={users.loading} />}
            <SystemStatusCard health={health.data} healthLoading={health.loading} jobStats={ops.data?.jobs} loading={ops.loading} />
          </div>
          {audit.error
            ? <Card><ErrorState title="Activity could not be loaded" error={audit.error} onRetry={audit.reload} /></Card>
            : <RecentActivityCard logs={audit.data?.rows} loading={audit.loading} limit={8} />}
        </div>
      </div>
    </>
  );
}
