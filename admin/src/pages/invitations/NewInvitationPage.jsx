import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { Notice } from '../../components/common/Misc';
import { FormField, Input, Select, Textarea } from '../../components/forms/FormField';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useMisc';
import { createInvitation } from '../../services/invitationService';
import { EXPIRY_OPTIONS } from '../../constants/domain';
import { useQuery } from '../../hooks/useQuery';
import { getMe } from '../../services/authService';
import { invitationSchema } from '../../utils/validation';
import { RoleOptions } from '../../components/users/roles';
import InvitationPreview from '../../components/invitations/InvitationPreview';
import InvitationSuccess from '../../components/invitations/InvitationSuccess';

const MSG_MAX = 500, NOTE_MAX = 300;

/** Defaults from the platform settings (GET /auth/me → settings.platform). */
function defaults(platform) {
  const pref = Number(platform && platform.defaultInvitationExpiryDays);
  const expiresInDays = pref >= 1 && pref <= 60 ? pref : 7;
  return { email: '', role: 'member', expiresInDays, message: '', note: '' };
}
const expiryOptions = days => (EXPIRY_OPTIONS.some(([d]) => d === days) ? EXPIRY_OPTIONS : [...EXPIRY_OPTIONS, [days, `${days} days`]].sort((a, b) => a[0] - b[0]));

export default function NewInvitationPage() {
  useDocumentTitle('New invitation');
  const navigate = useNavigate();
  const { name } = useAuth();
  const [created, setCreated] = useState(null);
  const { data: me } = useQuery(getMe, []);
  const platform = me?.settings?.platform;
  const workspaceName = platform?.displayName || 'DTS AI';
  const { register, control, handleSubmit, reset, watch, setError, setFocus, getFieldState, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(invitationSchema), defaultValues: defaults() });
  // apply the server's default expiry once it has loaded, unless the admin already picked one
  useEffect(() => { if (platform && !getFieldState('expiresInDays').isDirty) reset({ ...watch(), expiresInDays: defaults(platform).expiresInDays }); }, [platform?.defaultInvitationExpiryDays]); // eslint-disable-line react-hooks/exhaustive-deps
  const values = watch();
  const options = expiryOptions(Number(values.expiresInDays) || 7);
  const expiryLabel = (options.find(([d]) => d === Number(values.expiresInDays)) || [])[1];

  const onSubmit = async v => {
    try {
      const inv = await createInvitation({ ...v, message: v.message?.trim() || '', note: v.note?.trim() || '' });
      setCreated(inv);
      if (inv.emailSent) toast.success('Invitation sent.', { description: `An invitation email was sent to ${inv.email}.` });
      else toast.warning('Invitation created, but the email could not be sent.', { description: `Copy the link and share it with ${inv.email}.` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.status === 409 || err.status === 422 || /email|invitation/i.test(err.message)) { setError('email', { message: err.message }); setFocus('email'); }
      toast.error(err.message);
    }
  };
  const createAnother = () => { reset(defaults(platform)); setCreated(null); setTimeout(() => setFocus('email'), 50); };

  return (
    <>
      <Link to="/admin/invitations" className="mb-4 inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to invitations
      </Link>
      <PageHeader title="New invitation" description="Invite someone to the workspace with a role and an expiry. The invitation is emailed to them with a secure link." />

      {created ? (
        <div className="mx-auto max-w-2xl"><InvitationSuccess invitation={created} onCreateAnother={createAnother} /></div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="Invitation details" description="Fields marked * are required." />
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="card-pad space-y-5">
              <FormField label="Recipient email" error={errors.email?.message} required help="The person will use this address to sign up.">
                <Input type="email" autoComplete="off" placeholder="name@company.com" autoFocus {...register('email')} />
              </FormField>

              <fieldset>
                <legend className="label">Role<span className="ml-0.5 text-danger" aria-hidden="true">*</span></legend>
                <Controller control={control} name="role" render={({ field }) => <RoleOptions name="invite-role" value={field.value} onChange={field.onChange} error={errors.role?.message} />} />
                {errors.role && <p className="field-error" role="alert">{errors.role.message}</p>}
              </fieldset>

              <FormField label="Expires after" error={errors.expiresInDays?.message} help="Default comes from Platform settings.">
                <Select options={options.map(([d, l]) => [String(d), l])} {...register('expiresInDays')} />
              </FormField>

              <FormField label="Personal message" optional error={errors.message?.message} help={`${(values.message || '').length}/${MSG_MAX} · Shown to the recipient when they open the link.`}>
                <Textarea rows={4} placeholder="Add a short welcome note for the recipient." {...register('message')} />
              </FormField>

              <FormField label="Internal note" optional error={errors.note?.message} help={`${(values.note || '').length}/${NOTE_MAX} · Only visible to administrators.`}>
                <Textarea rows={2} placeholder="e.g. Finance onboarding batch" {...register('note')} />
              </FormField>

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <Button onClick={() => navigate('/admin/invitations')} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="primary" icon={Send} loading={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create invitation'}</Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-20 lg:col-span-2">
            <InvitationPreview email={values.email} role={values.role} expiryLabel={expiryLabel} message={values.message}
              inviterName={name || 'An administrator'} workspaceName={workspaceName} />
            <Notice title="Sent by email">The recipient gets an email with a secure link. The link and token are also shown to you once, as a backup if the email doesn&apos;t arrive.</Notice>
          </div>
        </div>
      )}
    </>
  );
}
