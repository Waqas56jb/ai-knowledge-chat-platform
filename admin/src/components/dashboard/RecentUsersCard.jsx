import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { Skeleton } from '../common/States';
import { relativeTime } from '../../utils/format';

/** Most recently created users with status and last activity. */
export default function RecentUsersCard({ users, loading, limit = 5 }) {
  const rows = (users || []).slice(0, limit);
  return (
    <Card className="min-w-0">
      <CardHeader title="Recent users" description="Newest accounts in the workspace"
        actions={<Link to="/admin/users" className="link inline-flex items-center gap-1 text-[13px]">View all users<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>} />
      {loading ? (
        <div className="divide-y divide-line" aria-busy="true" aria-label="Loading users">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] text-muted">No users yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(u => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                <Avatar name={u.name} />
                <div className="min-w-0">
                  <Link to={`/admin/users/${u.id}`} className="block break-words font-medium leading-snug text-ink hover:text-primary-text">{u.name}</Link>
                  <p className="truncate text-[12.5px] text-muted" title={u.email}>{u.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <StatusBadge status={u.status} />
                <span className="min-w-[88px] text-[12.5px] text-muted">
                  <span className="sr-only">Last active: </span>{u.lastActiveAt ? relativeTime(u.lastActiveAt) : 'Never active'}
                </span>
                <Button as={Link} to={`/admin/users/${u.id}`} size="sm" variant="ghost" icon={Eye} aria-label={`View ${u.name}`}>View</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
