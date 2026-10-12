import { Users, UserCheck, UserPlus, MessagesSquare, MessageCircleQuestion, Quote, OctagonAlert, Cpu } from 'lucide-react';
import StatCard from '../common/StatCard';
import { formatPercent } from '../../utils/format';

const CARDS = [
  { key: 'totalUsers', label: 'Total users', icon: Users, to: '/admin/users' },
  { key: 'activeUsers', label: 'Active users', icon: UserCheck },
  { key: 'newRegistrations', label: 'New registrations', icon: UserPlus },
  { key: 'conversations', label: 'Conversations', icon: MessagesSquare, to: '/admin/conversations' },
  { key: 'questions', label: 'Questions asked', icon: MessageCircleQuestion },
  { key: 'answered', label: 'Answers with citations', icon: Quote },
  { key: 'unsupported', label: 'Unsupported queries', icon: OctagonAlert, invert: true },
  { key: 'processingSuccess', label: 'Processing success rate', icon: Cpu, to: '/admin/processing' }
];

/** Per-card value/delta/hint from the server's `kpis` for the selected range. */
function metric(key, a) {
  const k = a.kpis;
  const rate = formatPercent(k.citationRate.value);
  switch (key) {
    case 'totalUsers': return { ...k.totalUsers, hint: `${k.totalUsers.hint}. The change compares new registrations with the previous period.` };
    case 'activeUsers': return { ...k.activeUsers, hint: k.activeUsers.hint || 'Users who asked at least one question in this period' };
    case 'newRegistrations': return { ...k.newRegistrations, hint: 'Accounts created in this period' };
    case 'questions': return { ...k.questions, hint: 'Questions sent to the assistant in this period' };
    case 'answered': return { ...k.answered, suffix: ` · ${rate}`, hint: `${rate} of questions were answered with at least one source citation` };
    case 'processingSuccess': return { ...k.processingSuccess, hint: k.processingSuccess.hint || 'Completed vs failed processing jobs in this period' };
    default: return k[key];
  }
}

/** Eight key metrics for the analytics page. */
export default function AnalyticsKpis({ analytics, loading }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(c => {
        const m = analytics ? metric(c.key, analytics) : null;
        return (
          <StatCard key={c.key} label={c.label} icon={c.icon} to={c.to} invert={c.invert} loading={loading || !m}
            value={m?.value ?? 0} delta={m?.delta ?? null} hint={m?.hint} suffix={m?.suffix || ''} />
        );
      })}
    </div>
  );
}
