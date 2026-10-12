import { Server, Database, Layers, KeyRound, Sparkles, Cpu } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { Skeleton } from '../common/States';
import { formatNumber, relativeTime } from '../../utils/format';

const okBadge = c => (c && c.ok ? 'ok' : 'down');

/**
 * Live system status from GET /health/ready (database, migrations, auth, OpenAI checks) plus the
 * processing queue counts from /admin/processing.
 */
export default function SystemStatusCard({ health, healthLoading, jobStats, loading }) {
  const c = (health && health.checks) || {};
  const reachable = health ? health.reachable : false;
  const jobs = jobStats
    ? `${formatNumber(jobStats.processing)} processing · ${formatNumber(jobStats.queued)} queued · ${formatNumber(jobStats.failed)} failed`
    : 'Job counts unavailable';
  const rows = [
    { icon: Server, name: 'API server', detail: reachable ? `Readiness: ${health.status}` : 'The API did not respond', status: reachable ? (health.status === 'ready' ? 'ready' : 'not_ready') : 'unreachable', live: 'health' },
    { icon: Database, name: 'Database', detail: c.database ? (c.database.ok ? `Responding in ${formatNumber(c.database.ms)} ms` : c.database.error || 'Check failed') : 'No result', status: okBadge(c.database), live: 'health' },
    { icon: Layers, name: 'Database migrations', detail: c.migrations ? (c.migrations.ok ? `${formatNumber(c.migrations.applied)} applied` : c.migrations.error || 'Pending or failed') : 'No result', status: okBadge(c.migrations), live: 'health' },
    { icon: KeyRound, name: 'Authentication', detail: c.auth ? (c.auth.ok ? `Identity provider responding in ${formatNumber(c.auth.ms)} ms` : c.auth.error || 'Check failed') : 'No result', status: okBadge(c.auth), live: 'health' },
    {
      icon: Sparkles, name: 'OpenAI',
      detail: c.openai ? (c.openai.configured ? [c.openai.chatModel, c.openai.embeddingModel].filter(Boolean).join(' · ') || 'Configured' : 'API key not configured') : 'No result',
      status: c.openai ? (c.openai.ok ? 'ok' : c.openai.configured ? 'down' : 'not_configured') : 'down', live: 'health'
    },
    { icon: Cpu, name: 'Processing queue', detail: jobs, status: jobStats ? (jobStats.failed ? 'failed' : 'ok') : 'down', label: jobStats ? (jobStats.failed ? `${formatNumber(jobStats.failed)} failed` : 'Healthy') : 'Unknown', live: 'jobs' }
  ];
  return (
    <Card className="min-w-0">
      <CardHeader title="System status" description="Live readiness checks reported by the API server" />
      <ul className="divide-y divide-line">
        {rows.map(({ icon: Icon, ...r }) => {
          const busy = r.live === 'health' ? healthLoading && !health : loading && !jobStats;
          return (
            <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-subtle text-muted"><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-[13.5px] font-medium text-ink">{r.name}</p>
                {busy ? <Skeleton className="mt-1 h-3 w-48 max-w-full" /> : <p className="text-[12.5px] text-muted [overflow-wrap:anywhere]">{r.detail}</p>}
              </div>
              {busy ? <Skeleton className="h-5 w-20 rounded-full" /> : <StatusBadge status={r.status} label={r.label} />}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[12.5px] text-faint">
        Checked {health && health.checkedAt ? relativeTime(health.checkedAt) : 'just now'} · refreshes every minute.
      </p>
    </Card>
  );
}
