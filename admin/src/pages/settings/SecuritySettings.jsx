import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useMisc';
import { Select, Switch } from '../../components/forms/FormField';
import { SettingsFormCard, SettingRow, SwitchRow, RadioCards } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

const TIMEOUTS = [15, 30, 60, 120, 480, 1440];
const timeoutLabel = m => (m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : m % 60 ? `${m} minutes` : `${m / 60} hours`);

const schema = z.object({
  sessionTimeoutMinutes: z.number().int().min(15, 'The timeout must be at least 15 minutes.').max(1440, 'The timeout must be 24 hours or less.'),
  restrictSourcesByRole: z.boolean(),
  readOnlyCanExport: z.boolean(),
  auditLogVisibility: z.enum(['administrators'])
});

/** The API only supports administrator-only audit logs. */
const VISIBILITY_OPTIONS = [
  { value: 'administrators', label: 'Administrators only', description: 'Only administrators can open audit logs.', icon: ShieldCheck }
];

const POLICIES = [
  ['restrictSourcesByRole', 'Restrict sources by role', 'Restricted and private sources are hidden from members without access.'],
  ['readOnlyCanExport', 'Allow read-only users to export', 'Read-only members may download CSV exports of data they can see.']
];

export default function SecuritySettings() {
  useDocumentTitle('Security settings');
  const state = useSettingsForm('security', schema);
  const { register, control, watch, formState: { errors } } = state.form;
  const timeout = watch('sessionTimeoutMinutes');
  const timeouts = timeout && !TIMEOUTS.includes(timeout) ? [...TIMEOUTS, timeout].sort((a, b) => a - b) : TIMEOUTS;

  return (
    <div className="space-y-6">
      <SettingsFormCard state={state} icon={ShieldCheck} title="Security" description="Session and access-control policies applied by the server.">
        <SettingRow label="Session timeout" description="How long an admin session lasts without “Remember me”." error={errors.sessionTimeoutMinutes?.message}
          help="Applies from the next sign-in.">
          <Select className="max-w-[220px]" options={timeouts.map(m => [m, timeoutLabel(m)])} {...register('sessionTimeoutMinutes', { setValueAs: v => Number(v) })} />
        </SettingRow>
        {POLICIES.map(([name, label, description]) => (
          <SwitchRow key={name}>
            <Controller control={control} name={name} render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} label={label} description={description} />
            )} />
          </SwitchRow>
        ))}
        <SettingRow label="Audit log visibility" description="Who may read the audit trail." group>
          <Controller control={control} name="auditLogVisibility" render={({ field }) => (
            <RadioCards name={field.name} value={field.value} onChange={field.onChange} options={VISIBILITY_OPTIONS} columns={1} />
          )} />
        </SettingRow>
      </SettingsFormCard>
    </div>
  );
}
