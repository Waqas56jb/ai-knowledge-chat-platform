import { z } from 'zod';
import { MessageSquareText } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useMisc';
import { SettingsFormCard, SettingRow, UnitInput } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

const int = (label, min, max) => z.number({ invalid_type_error: `Enter a number for ${label.toLowerCase()}.` })
  .int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`);

const schema = z.object({
  dailyQuestionLimitPerUser: int('Daily question limit', 1, 5000),
  maxQuestionLength: int('Maximum question length', 100, 4000)
});

/** chat section: per-user usage limits enforced by POST /chat. */
export default function ChatSettings() {
  useDocumentTitle('Chat limit settings');
  const state = useSettingsForm('chat', schema);
  const { register, formState: { errors } } = state.form;

  return (
    <SettingsFormCard state={state} icon={MessageSquareText} title="Chat limits" description="Usage limits applied to every member when they ask the assistant a question.">
      <SettingRow label="Daily question limit" description="Questions each user may ask per day (1–5000)." error={errors.dailyQuestionLimitPerUser?.message} required>
        <UnitInput type="number" inputMode="numeric" min={1} max={5000} step={1} suffix="per day" {...register('dailyQuestionLimitPerUser', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Maximum question length" description="Longest question a user can send (100–4000 characters)." error={errors.maxQuestionLength?.message} required>
        <UnitInput type="number" inputMode="numeric" min={100} max={4000} step={50} suffix="chars" {...register('maxQuestionLength', { valueAsNumber: true })} />
      </SettingRow>
    </SettingsFormCard>
  );
}
