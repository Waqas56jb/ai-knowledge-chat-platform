import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Compass } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useMisc';
import { Switch, Textarea } from '../../components/forms/FormField';
import TagInput from '../../components/knowledge/TagInput';
import { SettingsFormCard, SettingRow, SwitchRow } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

const schema = z.object({
  enforceScope: z.boolean(),
  allowedScope: z.string().trim().min(10, 'Describe the allowed scope in at least 10 characters.').max(1000, 'The scope must be 1000 characters or fewer.'),
  blockedTopics: z.array(z.string().trim().min(2, 'Topics must be at least 2 characters.').max(60, 'Topics must be 60 characters or fewer.')).max(50, 'Use at most 50 blocked topics.')
});

/** domain_policy section: what the assistant may answer and which topics it must refuse. */
export default function DomainPolicySettings() {
  useDocumentTitle('Domain policy settings');
  const state = useSettingsForm('domain_policy', schema);
  const { register, control, watch, formState: { errors } } = state.form;
  const scopeLength = (watch('allowedScope') || '').length;

  return (
    <SettingsFormCard state={state} icon={Compass} title="Domain policy" description="Keep the assistant focused on your knowledge base. Questions outside the scope get a polite refusal instead of an answer.">
      <SwitchRow>
        <Controller control={control} name="enforceScope" render={({ field }) => (
          <Switch checked={!!field.value} onChange={field.onChange} label="Enforce the allowed scope"
            description="When on, questions outside the scope below (or about a blocked topic) are answered as out of scope." />
        )} />
      </SwitchRow>
      <SettingRow label="Allowed scope" description="Plain-language description of what users may ask about." error={errors.allowedScope?.message}
        help={`${scopeLength} / 1000 characters`} required>
        <Textarea rows={4} className="max-w-xl" {...register('allowedScope')} />
      </SettingRow>
      <SettingRow label="Blocked topics" description="Topics the assistant always refuses, even if a source mentions them." error={errors.blockedTopics?.message || errors.blockedTopics?.[0]?.message} group>
        <Controller control={control} name="blockedTopics" render={({ field }) => (
          <TagInput value={field.value || []} onChange={field.onChange} max={50} maxLength={60} placeholder="Add a topic and press Enter" className="max-w-xl" />
        )} />
      </SettingRow>
    </SettingsFormCard>
  );
}
