import { Eye, ShieldCheck, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ROLES, ROLE_LABELS } from '../../constants/domain';

/** What each role can do (enforced by the API). Keys are the server role values. */
export const ROLE_INFO = {
  admin: { icon: ShieldCheck, tone: 'badge-primary', description: 'Manages users, invitations, knowledge sources and workspace settings.' },
  member: { icon: User, tone: 'badge-neutral', description: 'Asks questions and chats with the assistant across the sources they can access.' },
  readonly: { icon: Eye, tone: 'badge-info', description: 'Can browse approved sources and answers, but cannot ask questions or change anything.' }
};

/** The signed-in admin cannot suspend, revoke, delete or re-role themselves (the API refuses it too). */
export const isProtectedUser = (user, session) => !!user && !!session && !!session.user && user.id === session.user.id;

export function RoleBadge({ role, className }) {
  const info = ROLE_INFO[role];
  const Icon = info?.icon;
  return <span className={cn('badge', info?.tone || 'badge-neutral', className)}>{Icon && <Icon aria-hidden="true" />}{ROLE_LABELS[role] || role || '—'}</span>;
}

/**
 * Radio-card role picker.
 * <RoleOptions name="role" value={role} onChange={setRole} error="..." />
 */
export function RoleOptions({ name = 'role', value, onChange, error, disabled = false, compact = false, describedBy }) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} aria-invalid={error ? 'true' : undefined} className={cn('grid gap-2', !compact && 'sm:grid-cols-3')}>
      {ROLES.map(r => {
        const info = ROLE_INFO[r];
        const Icon = info.icon;
        const checked = value === r;
        return (
          <label key={r} className={cn('relative flex cursor-pointer gap-3 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-primary/40',
            checked ? 'border-primary-strong bg-primary-soft/50' : 'border-line bg-surface hover:border-primary/40 hover:bg-subtle/60',
            disabled && 'cursor-not-allowed opacity-60', !compact && 'sm:flex-col sm:gap-2')}>
            <input type="radio" className="sr-only" name={name} value={r} checked={checked} disabled={disabled} onChange={() => onChange(r)} />
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', checked ? 'bg-primary-strong text-primary-fg' : 'bg-subtle text-muted')}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink">{ROLE_LABELS[r]}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{info.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
