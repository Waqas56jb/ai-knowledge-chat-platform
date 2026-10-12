import { useId, useMemo, useState } from 'react';
import { Globe2, Users, Lock, Check } from 'lucide-react';
import { VISIBILITY, roleLabel } from '../../constants/domain';
import { getAllUsers } from '../../services/userService';
import { useQuery } from '../../hooks/useQuery';
import { cn } from '../../utils/cn';
import Avatar from '../common/Avatar';
import { SearchInput } from '../common/Filters';
import { Skeleton } from '../common/States';

const OPTIONS = [
  { id: 'workspace', icon: Globe2, hint: 'Every active workspace member can get answers from this source.' },
  { id: 'restricted', icon: Users, hint: 'Only the people you pick below.' },
  { id: 'private', icon: Lock, hint: 'Visible to administrators only; never used in member answers.' }
];

/**
 * Visibility radio cards plus a searchable user picker when "restricted".
 * The API enforces these rules when answering questions.
 */
export default function VisibilityPicker({ value: rawValue, onChange, allowedUserIds = [], onUsersChange, usersError, name = 'visibility' }) {
  const value = rawValue === 'all' ? 'workspace' : rawValue;
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Who can use this source?</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {OPTIONS.map(o => {
            const active = value === o.id;
            return (
              <label key={o.id} className={cn('relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition focus-within:ring-4 focus-within:ring-primary/15',
                active ? 'border-primary bg-primary-soft/50' : 'border-line bg-surface hover:border-primary/40 hover:bg-subtle/60')}>
                <input type="radio" name={name} value={o.id} checked={active} onChange={() => onChange(o.id)} className="sr-only" />
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', active ? 'bg-primary-strong text-primary-fg' : 'bg-subtle text-muted')}><o.icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{VISIBILITY[o.id]}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">{o.hint}</span>
                </span>
                {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary-text" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </fieldset>
      {value === 'restricted' && <UserPicker value={allowedUserIds} onChange={onUsersChange} error={usersError} />}
    </div>
  );
}

function UserPicker({ value, onChange, error }) {
  const labelId = useId();
  const [q, setQ] = useState('');
  const { data: users, loading, error: loadError, reload } = useQuery(() => getAllUsers(), []);
  const eligible = useMemo(() => (users || []).filter(u => u.status !== 'revoked'), [users]);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return eligible.filter(u => !n || `${u.name} ${u.email} ${u.department}`.toLowerCase().includes(n)); }, [eligible, q]);
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  const selected = eligible.filter(u => value.includes(u.id));

  return (
    <div className="rounded-xl border border-line bg-subtle/40 p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-ink" id={labelId}>Allowed users <span className="font-normal text-muted">({value.length} selected)</span></p>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map(u => (
            <button key={u.id} type="button" onClick={() => toggle(u.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2 text-[12.5px] text-ink hover:border-danger/40" aria-label={`Remove ${u.name}`}>
              <Avatar name={u.name} size="xs" />{u.name}<span aria-hidden="true" className="text-faint">×</span>
            </button>
          ))}
        </div>
      )}
      <SearchInput value={q} onChange={setQ} placeholder="Search people" label="Search users" className="sm:max-w-none" />
      <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto" role="group" aria-labelledby={labelId}>
        {loading && [0, 1, 2].map(i => <li key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="w-40" /></li>)}
        {!loading && loadError && <li className="px-2 py-3 text-[13px] text-danger" role="alert">People could not be loaded. <button type="button" className="link" onClick={reload}>Try again</button></li>}
        {!loading && !loadError && !shown.length && <li className="px-2 py-3 text-[13px] text-muted">{q ? `No people match “${q}”.` : 'No users yet.'}</li>}
        {shown.map(u => (
          <li key={u.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
              <input type="checkbox" className="checkbox" checked={value.includes(u.id)} onChange={() => toggle(u.id)} />
              <Avatar name={u.name} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink">{u.name}</span>
                <span className="block truncate text-[12px] text-muted">{u.email} · {roleLabel(u.role)}{u.status !== 'active' ? ` · ${u.status}` : ''}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="mt-2 text-[12px] text-faint">Only these people (and administrators) can get answers from this source.</p>
    </div>
  );
}
