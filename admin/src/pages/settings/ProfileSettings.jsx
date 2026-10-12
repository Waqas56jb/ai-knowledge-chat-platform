import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Check, UserRound } from 'lucide-react';
import { TIMEZONES, LANGUAGES, withCurrent } from '../../constants/domain';
import { useDocumentTitle } from '../../hooks/useMisc';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';
import { Input, Select } from '../../components/forms/FormField';
import { SettingsFormCard, SettingRow } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

/* Avatar colours use theme tokens so they work in light and dark mode. */
const AVATAR_COLORS = [
  ['gold', 'Gold', 'bg-primary-soft text-primary-text ring-primary/40'],
  ['green', 'Green', 'bg-success-soft text-success ring-success/40'],
  ['blue', 'Blue', 'bg-info-soft text-info ring-info/40'],
  ['coral', 'Coral', 'bg-danger-soft text-danger ring-danger/40'],
  ['graphite', 'Graphite', 'bg-ink text-surface ring-ink/30']
];
const colorClass = v => (AVATAR_COLORS.find(c => c[0] === v) || AVATAR_COLORS[0])[2];

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name (at least 2 characters).').max(80, 'Name must be 80 characters or fewer.'),
  email: z.string(),
  department: z.string().trim().max(60, 'Department must be 60 characters or fewer.'),
  avatarColor: z.enum(AVATAR_COLORS.map(c => c[0]), { errorMap: () => ({ message: 'Choose an avatar colour.' }) }),
  timezone: z.string().min(1, 'Choose a time zone.').max(64),
  language: z.string().min(1, 'Choose a language.').max(40)
});

/** The signed-in admin's own profile (GET/PATCH /users/me). Email and role are managed by administrators. */
export default function ProfileSettings() {
  useDocumentTitle('Profile settings');
  const state = useSettingsForm('profile', schema);
  const { register, control, watch, formState: { errors } } = state.form;
  const name = watch('name');
  const color = watch('avatarColor');
  const timezone = watch('timezone');
  const language = watch('language');

  return (
    <SettingsFormCard state={state} icon={UserRound} title="Profile" description="How you appear in the admin console and the audit log.">
      <SettingRow label="Avatar" description="Initials avatar colour (saved with your profile preferences)." group>
        <div className="flex flex-wrap items-center gap-5">
          <span className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-full font-display text-[20px] font-semibold ring-4', colorClass(color))} aria-hidden="true">{initials(name || '?')}</span>
          <Controller control={control} name="avatarColor" render={({ field }) => (
            <div role="radiogroup" aria-label="Avatar colour" className="flex flex-wrap gap-2.5">
              {AVATAR_COLORS.map(([v, label, cls]) => (
                <label key={v} className="relative cursor-pointer rounded-full has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/30" title={label}>
                  <input type="radio" name={field.name} value={v} checked={field.value === v} onChange={() => field.onChange(v)} onBlur={field.onBlur} className="sr-only" aria-label={label} />
                  <span className={cn('grid h-9 w-9 place-items-center rounded-full transition', cls, field.value === v ? 'ring-2 ring-offset-2 ring-offset-surface' : 'opacity-80 hover:opacity-100')}>
                    {field.value === v && <Check className="h-4 w-4" aria-hidden="true" />}
                  </span>
                </label>
              ))}
            </div>
          )} />
        </div>
      </SettingRow>
      <SettingRow label="Full name" description="Shown in the header, sidebar and audit log." error={errors.name?.message} required>
        <Input className="max-w-md" autoComplete="name" {...register('name')} />
      </SettingRow>
      <SettingRow label="Email" description="Your sign-in address." help="Read-only. Another administrator can change it from the Users page.">
        <Input className="max-w-md" type="email" readOnly aria-readonly="true" {...register('email')} />
      </SettingRow>
      <SettingRow label="Department" description="Optional, visible to other administrators." error={errors.department?.message}>
        <Input className="max-w-md" placeholder="e.g. Operations" {...register('department')} />
      </SettingRow>
      <SettingRow label="Time zone" description="Saved with your profile." error={errors.timezone?.message}
        help="Dates in this console follow your browser’s time zone.">
        <Select className="max-w-xs" options={withCurrent(TIMEZONES, timezone)} {...register('timezone')} />
      </SettingRow>
      <SettingRow label="Language" description="Interface language preference." error={errors.language?.message}
        help="The admin console is currently available in English only.">
        <Select className="max-w-xs" options={withCurrent(LANGUAGES, language)} {...register('language')} />
      </SettingRow>
    </SettingsFormCard>
  );
}
