import { Users, UserCheck, Library, MessagesSquare, CircleCheck, OctagonAlert } from 'lucide-react';
import StatCard from '../common/StatCard';

const CARDS = [
  { key: 'totalUsers', label: 'Total users', icon: Users, to: '/admin/users' },
  { key: 'activeUsers', label: 'Active users', icon: UserCheck, to: '/admin/analytics' },
  { key: 'sources', label: 'Knowledge sources', icon: Library, to: '/admin/knowledge' },
  { key: 'conversations', label: 'Total conversations', icon: MessagesSquare, to: '/admin/conversations' },
  { key: 'answered', label: 'Questions answered', icon: CircleCheck, to: '/admin/analytics' },
  { key: 'unsupported', label: 'Failed or unsupported queries', icon: OctagonAlert, to: '/admin/conversations', invert: true }
];

/** Six headline KPIs from `analytics.kpis`. */
export default function DashboardKpis({ kpis, loading }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {CARDS.map(c => {
        const k = kpis?.[c.key];
        return (
          <StatCard key={c.key} label={c.label} icon={c.icon} to={c.to} invert={c.invert} loading={loading || !k}
            value={k?.value ?? 0} delta={k?.delta ?? null} hint={k?.hint} suffix={k?.suffix} />
        );
      })}
    </div>
  );
}
