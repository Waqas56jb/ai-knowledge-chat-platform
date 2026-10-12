import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { LANGUAGES, VISIBILITY, withCurrent } from '../../constants/domain';
import { useDocumentTitle } from '../../hooks/useMisc';
import { Input, Select, Switch, Textarea } from '../../components/forms/FormField';
import { SettingsFormCard, SettingRow, SwitchRow, UnitInput } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

const int = (label, min, max) => z.number({ invalid_type_error: `Enter a number for ${label}.` })
  .int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`);

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(80, 'Display name must be 80 characters or fewer.'),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer.'),
  defaultLanguage: z.string().trim().min(1, 'Choose a language.').max(40),
  invitationOnly: z.boolean(),
  defaultInvitationExpiryDays: int('Invitation expiry', 1, 60),
  maxFileSizeMb: int('Maximum file size', 1, 1000),
  defaultVisibility: z.enum(Object.keys(VISIBILITY), { errorMap: () => ({ message: 'Choose a visibility.' }) })
});

export default function PlatformSettings() {
  useDocumentTitle('Platform settings');
  const state = useSettingsForm('platform', schema);
  const { register, control, watch, formState: { errors } } = state.form;
  const descLength = (watch('description') || '').length;
  const language = watch('defaultLanguage');

  return (
    <SettingsFormCard state={state} icon={Building2} title="Platform" description="Workspace identity and defaults for new users and sources.">
      <SettingRow label="Display name" description="Product name shown to users." error={errors.displayName?.message} required>
        <Input className="max-w-md" {...register('displayName')} />
      </SettingRow>
      <SettingRow label="Product description" description="Short summary shown on the user sign-in page." error={errors.description?.message}
        help={`${descLength} / 500 characters`}>
        <Textarea rows={3} className="max-w-xl" {...register('description')} />
      </SettingRow>
      <SettingRow label="Default language" description="Language for new users." error={errors.defaultLanguage?.message}>
        <Select className="max-w-xs" options={withCurrent(LANGUAGES, language)} {...register('defaultLanguage')} />
      </SettingRow>
      <SwitchRow>
        <Controller control={control} name="invitationOnly" render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label="Invitation-only registration"
            description="Only people with a valid invitation link can create an account." />
        )} />
      </SwitchRow>
      <SettingRow label="Default invitation expiry" description="Pre-filled when creating an invitation (1–60 days)." error={errors.defaultInvitationExpiryDays?.message} required>
        <UnitInput type="number" inputMode="numeric" min={1} max={60} step={1} suffix="days" {...register('defaultInvitationExpiryDays', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Max upload size" description="Largest document administrators can upload. The server also enforces its own hard limit." error={errors.maxFileSizeMb?.message} required>
        <UnitInput type="number" inputMode="numeric" min={1} step={1} suffix="MB" {...register('maxFileSizeMb', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Default source visibility" description="Applied to newly added knowledge sources." error={errors.defaultVisibility?.message}>
        <Select className="max-w-sm" options={Object.entries(VISIBILITY)} {...register('defaultVisibility')} />
      </SettingRow>
    </SettingsFormCard>
  );
}
