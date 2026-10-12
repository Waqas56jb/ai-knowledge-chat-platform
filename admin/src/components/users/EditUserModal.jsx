import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { SearchInput } from '../common/Filters';
import { SourceTypeIcon } from '../common/Misc';
import StatusBadge from '../common/StatusBadge';
import { Skeleton } from '../common/States';
import { FormField, Input, Select, Textarea } from '../forms/FormField';
import { userSchema } from '../../utils/validation';
import { getUserById, updateUser } from '../../services/userService';
import { getAllSources } from '../../services/knowledgeService';
import { useQuery } from '../../hooks/useQuery';
import { SOURCE_ACCESS, USER_STATUSES, roleLabel, sourceTypeLabel } from '../../constants/domain';
import { capitalize } from '../../utils/format';
import { RoleOptions } from './roles';

const toValues = (u, allowed) => ({
  name: u?.name || '', email: u?.email || '', role: u?.role || 'member', status: u?.status || 'active',
  department: u?.department || '', notes: u?.notes || '',
  sourceAccess: u?.sourceAccess === 'restricted' ? 'restricted' : 'workspace',
  allowedSourceIds: allowed || u?.allowedSourceIds || []
});

/** Fields that changed, in the API's PATCH shape. */
function diff(values, user, allowedBefore) {
  const out = {};
  if (values.name.trim() !== (user.name || '')) out.name = values.name.trim();
  if (values.email.trim().toLowerCase() !== (user.email || '').toLowerCase()) out.email = values.email.trim();
  ['role', 'status', 'sourceAccess'].forEach(k => { if (values[k] !== (k === 'sourceAccess' ? (user.sourceAccess === 'restricted' ? 'restricted' : 'workspace') : user[k])) out[k] = values[k]; });
  if ((values.department || '') !== (user.department || '')) out.department = values.department || '';
  if ((values.notes || '') !== (user.notes || '')) out.notes = values.notes || '';
  const ids = values.sourceAccess === 'restricted' ? values.allowedSourceIds : [];
  const before = [...(allowedBefore || [])].sort().join(',');
  if ([...ids].sort().join(',') !== before || out.sourceAccess) out.allowedSourceIds = ids;
  return out;
}

/** Edit a user's profile, role, status and knowledge-source access (PATCH /admin/users/:id). */
export default function EditUserModal({ user, open, onClose, protectedUser = false }) {
  // the list rows do not carry allowedSourceIds; load the full record when the dialog opens
  const detail = useQuery(() => (open && user ? getUserById(user.id) : Promise.resolve(null)), [open, user?.id]);
  const full = detail.data && user && detail.data.id === user.id ? detail.data : null;
  const { register, control, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(userSchema), defaultValues: toValues(user) });

  useEffect(() => { if (open) reset(toValues(full || user, full?.allowedSourceIds)); }, [open, user?.id, full?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const notes = watch('notes') || '';
  const access = watch('sourceAccess');

  const onSubmit = async values => {
    const base = full || user;
    const changes = diff(values, base, full?.allowedSourceIds);
    if (protectedUser) { delete changes.status; delete changes.role; }
    if (!Object.keys(changes).length) { onClose(); return; }
    try {
      await updateUser(user.id, changes);
      toast.success('User updated.', { description: changes.role ? `Role changed to ${roleLabel(changes.role)}.` : `${values.name}'s details were saved.` });
      onClose();
    } catch (err) {
      const fieldErrors = Array.isArray(err.details) ? err.details : [];
      fieldErrors.forEach(d => { const f = d.field === 'fullName' ? 'name' : d.field; if (f && f in values) setError(f, { message: d.message }); });
      if (/email/i.test(err.message) && !fieldErrors.length) setError('email', { message: err.message });
      toast.error(err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit user" description={user ? `Update ${user.name}'s details and access.` : undefined} size="lg"
      dismissible={!isSubmitting}
      footer={<>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" icon={Save} type="submit" form="edit-user-form" loading={isSubmitting} disabled={!isDirty || (detail.loading && !full)}>Save changes</Button>
      </>}>
      <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" error={errors.name?.message} required>
            <Input autoComplete="off" {...register('name')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" autoComplete="off" {...register('email')} />
          </FormField>
          <FormField label="Department" error={errors.department?.message} optional>
            <Input placeholder="e.g. Sales" {...register('department')} />
          </FormField>
          <FormField label="Status" error={errors.status?.message} help={protectedUser ? 'You cannot change the status of your own account.' : undefined}>
            <Select options={USER_STATUSES.map(s => [s, capitalize(s)])} disabled={protectedUser} {...register('status')} />
          </FormField>
        </div>
        <fieldset>
          <legend className="label">Role {protectedUser && <span className="ml-1.5 text-[12px] font-normal text-faint">You cannot change your own role</span>}</legend>
          <Controller control={control} name="role" render={({ field }) => <RoleOptions name="edit-role" value={field.value} onChange={field.onChange} error={errors.role?.message} disabled={protectedUser} />} />
          {errors.role && <p className="field-error" role="alert">{errors.role.message}</p>}
        </fieldset>
        <FormField label="Knowledge-source access" error={errors.sourceAccess?.message} help="Restricted users only see the sources selected below (plus restricted sources they were added to).">
          <Select options={Object.entries(SOURCE_ACCESS)} {...register('sourceAccess')} />
        </FormField>
        {access === 'restricted' && (
          <Controller control={control} name="allowedSourceIds" render={({ field }) => (
            <SourcePicker value={field.value} onChange={field.onChange} error={errors.allowedSourceIds?.message} loading={detail.loading && !full} />
          )} />
        )}
        <FormField label="Administrative notes" error={errors.notes?.message} optional help={`${notes.length}/2000 · Visible to administrators only.`}>
          <Textarea rows={3} {...register('notes')} />
        </FormField>
      </form>
    </Modal>
  );
}

/** Searchable checkbox list of every knowledge source. */
function SourcePicker({ value, onChange, error, loading: outerLoading }) {
  const labelId = useId();
  const [q, setQ] = useState('');
  const { data: sources, loading, error: loadError, reload } = useQuery(getAllSources, []);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return (sources || []).filter(s => !n || `${s.title} ${s.tags.join(' ')}`.toLowerCase().includes(n)); }, [sources, q]);
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  const busy = loading || outerLoading;
  return (
    <div className="rounded-xl border border-line bg-subtle/40 p-3.5">
      <p className="mb-3 text-[13.5px] font-semibold text-ink" id={labelId}>Allowed sources <span className="font-normal text-muted">({value.length} selected)</span></p>
      <SearchInput value={q} onChange={setQ} placeholder="Search sources" label="Search sources" className="sm:max-w-none" />
      <ul className="mt-2 max-h-60 space-y-0.5 overflow-y-auto" role="group" aria-labelledby={labelId}>
        {busy && [0, 1, 2].map(i => <li key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-6 w-6 rounded-md" /><Skeleton className="w-48" /></li>)}
        {!busy && loadError && <li className="px-2 py-3 text-[13px] text-danger" role="alert">Sources could not be loaded. <button type="button" className="link" onClick={reload}>Try again</button></li>}
        {!busy && !loadError && !shown.length && <li className="px-2 py-3 text-[13px] text-muted">{q ? `No sources match “${q}”.` : 'No knowledge sources yet.'}</li>}
        {!busy && shown.map(s => (
          <li key={s.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface">
              <input type="checkbox" className="checkbox" checked={value.includes(s.id)} onChange={() => toggle(s.id)} />
              <SourceTypeIcon type={s.type} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink">{s.title}</span>
                <span className="block truncate text-[12px] text-muted">{sourceTypeLabel(s.type)}</span>
              </span>
              <StatusBadge status={s.status} />
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
