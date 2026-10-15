import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, EyeOff, PencilLine, RefreshCw, Save, Sparkles, Trash2, TrendingUp, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader } from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Notice } from '../common/Misc';
import { EmptyState } from '../common/States';
import { useConfirm } from '../common/ConfirmDialog';
import { FormField, Input, Select, Textarea } from '../forms/FormField';
import TagInput from '../knowledge/TagInput';
import { BUSINESS_PROFILE_FIELDS, BUSINESS_REVENUE_FIELDS, BUSINESS_STAGES, BUSINESS_STAGE_LABELS, businessFieldLabel } from '../../constants/domain';
import { clearBusinessProfile, refreshBusinessProfile, releaseBusinessProfileFields, updateBusinessProfile } from '../../services/userService';
import { formatDateTime, pluralize, relativeTime } from '../../utils/format';

const TEXT_FIELDS = ['businessName', 'businessType', 'userRole', 'city', 'state', 'country', 'monthlyVolume', 'teamSize', ...BUSINESS_REVENUE_FIELDS, 'summary'];
const LIST_FIELDS = ['products', 'clientTypes'];
const MAX = { businessName: 200, summary: 2000 };
const LIST_MAX = 12;
const LIST_ITEM_MAX = 80;

/** True when the profile has no values at all (e.g. created by a refresh with no messages yet). */
export function isEmptyProfile(p) {
  if (!p) return true;
  return !p.manualFields.length && TEXT_FIELDS.every(f => !p[f]) && !p.businessStage && LIST_FIELDS.every(f => !p[f].length);
}

const text = (label, max = 120) => z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);
const schema = z.object({
  ...Object.fromEntries(TEXT_FIELDS.map(f => [f, text(businessFieldLabel(f), MAX[f] || 120)])),
  businessStage: z.union([z.enum(BUSINESS_STAGES), z.literal('')]),
  products: z.array(z.string().trim().min(1).max(LIST_ITEM_MAX)).max(LIST_MAX, `At most ${LIST_MAX} products.`),
  clientTypes: z.array(z.string().trim().min(1).max(LIST_ITEM_MAX)).max(LIST_MAX, `At most ${LIST_MAX} client types.`)
});

const toValues = p => ({
  ...Object.fromEntries(TEXT_FIELDS.map(f => [f, (p && p[f]) || ''])),
  businessStage: (p && p.businessStage) || '',
  products: (p && p.products) || [],
  clientTypes: (p && p.clientTypes) || []
});

/** Only the fields that changed, in the PATCH shape ('' → null so a field can be cleared). */
export function profileDiff(values, p) {
  const before = toValues(p);
  const out = {};
  TEXT_FIELDS.forEach(f => { const v = values[f].trim(); if (v !== before[f].trim()) out[f] = v || null; });
  if (values.businessStage !== before.businessStage) out.businessStage = values.businessStage || null;
  LIST_FIELDS.forEach(f => { if (values[f].join('\u0000') !== before[f].join('\u0000')) out[f] = values[f]; });
  return out;
}

/**
 * "Business profile" tab on the user page. The profile is hidden from the member: the AI builds it from
 * the member's own messages and uses it to personalise answers. Admin edits are kept (manualFields) until
 * released back to the AI.
 */
export default function BusinessProfileTab({ user }) {
  const p = user.businessProfile;
  const confirm = useConfirm();
  const [busy, setBusy] = useState(null); // 'refresh' | 'clear' | `release:${field}`
  const [editing, setEditing] = useState(false);
  const empty = isEmptyProfile(p);

  const refresh = async () => {
    setBusy('refresh');
    try {
      const r = await refreshBusinessProfile(user.id);
      if (!r || isEmptyProfile(r)) toast.info('Nothing to build yet.', { description: `${user.name} has no messages the AI could use.` });
      else toast.success('Business profile refreshed.', { description: `Rebuilt from ${pluralize(r.messagesAnalyzed || 0, 'message')}.` });
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const release = async field => {
    setBusy(`release:${field}`);
    try {
      await releaseBusinessProfileFields(user.id, [field]);
      toast.success(`${businessFieldLabel(field)} is managed by AI again.`, { description: 'It will be updated on the next refresh.' });
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const clear = async () => {
    const ok = await confirm({
      title: 'Clear business profile?',
      message: `Everything the AI learned about ${user.name}'s business, and any admin edits, will be deleted. A new profile is built automatically from their next conversations.`,
      confirmLabel: 'Clear profile', danger: true
    });
    if (!ok) return;
    setBusy('clear');
    try { await clearBusinessProfile(user.id); toast.success('Business profile cleared.'); } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  const hiddenNote = (
    <Notice title="Hidden from the user" className="mb-6">
      Built by AI from the user&apos;s own messages and used to personalise their answers.
    </Notice>
  );

  if (empty) return (
    <>
      {hiddenNote}
      <Card>
        <EmptyState icon={Briefcase} title="No business profile yet"
          description="No business profile yet. It is built automatically from this user's conversations."
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={RefreshCw} loading={busy === 'refresh'} onClick={refresh}>Refresh from conversations</Button>
              <Button icon={PencilLine} onClick={() => setEditing(true)} disabled={!!busy}>Enter details manually</Button>
            </div>
          )} />
      </Card>
      <EditBusinessProfileModal open={editing} onClose={() => setEditing(false)} user={user} profile={p} />
    </>
  );

  const manual = new Set(p.manualFields);
  const value = f => {
    if (f === 'businessStage') return p.businessStage ? BUSINESS_STAGE_LABELS[p.businessStage] || p.businessStage : null;
    if (LIST_FIELDS.includes(f)) return p[f].length ? <span className="flex flex-wrap gap-1">{p[f].map(t => <span key={t} className="badge badge-neutral whitespace-normal break-words">{t}</span>)}</span> : null;
    return p[f] || null;
  };

  const field = ([f, label]) => (
    <ProfileField key={f} label={label} edited={manual.has(f)} releasing={busy === `release:${f}`} onRelease={() => release(f)} disabled={!!busy}>
      {value(f)}
    </ProfileField>
  );

  return (
    <>
      {hiddenNote}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Business profile" icon={Briefcase}
              description={p.generatedAt
                ? <>Last updated from {pluralize(p.messagesAnalyzed || 0, 'message')}, <time dateTime={p.generatedAt} title={formatDateTime(p.generatedAt)}>{relativeTime(p.generatedAt)}</time>.</>
                : 'Not generated by AI yet; only admin-entered details are shown.'}
              actions={<>
                <Button size="sm" icon={RefreshCw} loading={busy === 'refresh'} disabled={!!busy && busy !== 'refresh'} onClick={refresh}>Refresh from conversations</Button>
                <Button size="sm" variant="primary" icon={PencilLine} onClick={() => setEditing(true)} disabled={!!busy}>Edit</Button>
              </>} />
            <dl className="grid gap-x-6 gap-y-4 p-5 text-[13.5px] sm:grid-cols-2">
              {BUSINESS_PROFILE_FIELDS.filter(([f]) => f !== 'summary' && !BUSINESS_REVENUE_FIELDS.includes(f)).map(field)}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Revenue & advertising" icon={TrendingUp} description="As the user described them, e.g. “$40k/month” or “$150/day”." />
            <dl className="grid gap-x-6 gap-y-4 p-5 text-[13.5px] sm:grid-cols-3">
              {BUSINESS_PROFILE_FIELDS.filter(([f]) => BUSINESS_REVENUE_FIELDS.includes(f)).map(field)}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Summary" icon={Sparkles} />
            <dl className="p-5 text-[13.5px]">
              <ProfileField label="AI summary" labelHidden edited={manual.has('summary')} releasing={busy === 'release:summary'} onRelease={() => release('summary')} disabled={!!busy}>
                {p.summary ? <span className="whitespace-pre-line leading-relaxed">{p.summary}</span> : null}
              </ProfileField>
            </dl>
          </Card>
          <Card padded>
            <h2 className="card-title">About this profile</h2>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li className="flex gap-2"><EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />Never shown to the user and never returned by user endpoints.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />Updated automatically about 2 minutes after a conversation goes quiet.</li>
              <li className="flex gap-2"><PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />Fields you edit are marked <span className="badge badge-warning">Edited</span> and the AI no longer changes them until you let it manage them again.</li>
            </ul>
            {p.lastMessageAt && <p className="mt-3 text-[12.5px] text-faint">Newest analysed message: {formatDateTime(p.lastMessageAt)}</p>}
            <div className="mt-4 border-t border-line pt-4">
              <Button variant="danger-ghost" size="sm" icon={Trash2} loading={busy === 'clear'} disabled={!!busy && busy !== 'clear'} onClick={clear}>Clear profile</Button>
            </div>
          </Card>
        </div>
      </div>
      <EditBusinessProfileModal open={editing} onClose={() => setEditing(false)} user={user} profile={p} />
    </>
  );
}

function ProfileField({ label, labelHidden = false, edited, onRelease, releasing, disabled, children }) {
  return (
    <div className="min-w-0">
      <dt className={labelHidden && !edited ? 'sr-only' : 'mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1'}>
        <span className={labelHidden ? 'sr-only' : 'text-[12px] font-medium uppercase tracking-wide text-faint'}>{label}</span>
        {edited && (
          <>
            <span className="badge badge-warning" title="Edited by an administrator; the AI does not change it">Edited</span>
            <Button variant="ghost" size="sm" icon={Undo2} loading={releasing} disabled={disabled && !releasing} onClick={onRelease}
              className="h-6 px-1.5 text-[12px]" title={`Let the AI manage ${label.toLowerCase()} again`}>Let AI manage again</Button>
          </>
        )}
      </dt>
      <dd className="break-words text-ink">{children ?? <span className="text-faint">Not known</span>}</dd>
    </div>
  );
}

/** react-hook-form + zod; PATCHes only the changed fields (each becomes an admin-edited field). */
function EditBusinessProfileModal({ open, onClose, user, profile }) {
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: toValues(profile) });
  useEffect(() => { if (open) reset(toValues(profile)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async values => {
    const changes = profileDiff(values, profile);
    if (!Object.keys(changes).length) { onClose(); return; }
    try {
      await updateBusinessProfile(user.id, changes);
      const names = Object.keys(changes).map(businessFieldLabel);
      toast.success('Business profile updated.', { description: `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} now marked as edited; the AI will not change ${names.length === 1 ? 'it' : 'them'}.` });
      onClose();
    } catch (err) {
      (Array.isArray(err.details) ? err.details : []).forEach(d => { const f = String(d.field || '').replace(/^body\./, ''); if (f in values) setError(f, { message: d.message }); });
      toast.error(err.message);
    }
  };

  const textField = (f, extra = {}) => (
    <FormField label={businessFieldLabel(f)} error={errors[f]?.message} optional>
      <Input maxLength={MAX[f] || 120} autoComplete="off" {...extra} {...register(f)} />
    </FormField>
  );

  return (
    <Modal open={open} onClose={onClose} title="Edit business profile" size="lg" dismissible={!isSubmitting}
      description={`Only the fields you change are saved. They are marked as edited and the AI will not overwrite them. ${user.name} never sees this profile.`}
      footer={<>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" icon={Save} type="submit" form="business-profile-form" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
      </>}>
      <form id="business-profile-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {textField('businessName', { placeholder: 'e.g. Lone Star Supplies' })}
          {textField('businessType', { placeholder: 'e.g. Medical supply reseller' })}
          {textField('userRole', { placeholder: 'e.g. Owner' })}
          <FormField label="Stage" error={errors.businessStage?.message} optional>
            <Select placeholder="Not known" options={BUSINESS_STAGES.map(s => [s, BUSINESS_STAGE_LABELS[s]])} {...register('businessStage')} />
          </FormField>
          {textField('city')}
          {textField('state')}
          {textField('country')}
          {textField('monthlyVolume', { placeholder: 'e.g. 2,000 boxes a month' })}
          {textField('teamSize', { placeholder: 'e.g. 3 people' })}
        </div>
        <fieldset className="space-y-3">
          <legend className="text-[13px] font-semibold uppercase tracking-wide text-faint">Revenue &amp; advertising</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {textField('monthlyRevenue', { placeholder: 'e.g. $40k/month' })}
            {textField('metaAdSpend', { placeholder: 'e.g. $150/day' })}
            {textField('googleAdSpend', { placeholder: 'e.g. $3k/month' })}
          </div>
        </fieldset>
        <FormField label="Products" error={errors.products?.message} optional>
          <Controller control={control} name="products" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} max={LIST_MAX} maxLength={LIST_ITEM_MAX} placeholder="Add a product and press Enter" />} />
        </FormField>
        <FormField label="Client types" error={errors.clientTypes?.message} optional>
          <Controller control={control} name="clientTypes" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} max={LIST_MAX} maxLength={LIST_ITEM_MAX} placeholder="Add a client type and press Enter" />} />
        </FormField>
        <FormField label="Summary" error={errors.summary?.message} optional>
          <Textarea rows={4} maxLength={2000} {...register('summary')} />
        </FormField>
      </form>
    </Modal>
  );
}
