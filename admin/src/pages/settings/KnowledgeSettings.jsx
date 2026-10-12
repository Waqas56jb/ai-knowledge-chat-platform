import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { BookOpenText, Check, EyeOff, ListOrdered, TextQuote } from 'lucide-react';
import { SOURCE_TYPES } from '../../constants/domain';
import { useDocumentTitle } from '../../hooks/useMisc';
import { cn } from '../../utils/cn';
import { Textarea } from '../../components/forms/FormField';
import { SourceTypeIcon } from '../../components/common/Misc';
import { SettingsFormCard, SettingRow, UnitInput, RadioCards } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';

const int = (label, min, max) => z.number({ invalid_type_error: `Enter a number for ${label.toLowerCase()}.` })
  .int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`);

const schema = z.object({
  supportedTypes: z.array(z.enum(Object.keys(SOURCE_TYPES))).min(1, 'Keep at least one source type enabled.'),
  chunkSize: int('Chunk size', 200, 4000),
  chunkOverlap: int('Overlap', 0, 1000),
  retrievalCount: int('Retrieval count', 1, 20),
  minSimilarity: z.number({ invalid_type_error: 'Enter a number between 0 and 0.95.' }).min(0, 'Minimum similarity must be at least 0.').max(0.95, 'Minimum similarity must be 0.95 or less.'),
  citationDisplay: z.enum(['inline', 'footnotes', 'hidden']),
  fallbackMessage: z.string().trim().min(10, 'The fallback message must be at least 10 characters.').max(500, 'Fallback message must be 500 characters or fewer.')
}).superRefine((v, ctx) => {
  if (Number.isFinite(v.chunkSize) && Number.isFinite(v.chunkOverlap) && v.chunkOverlap >= v.chunkSize) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chunkOverlap'], message: `Overlap must be smaller than the chunk size (${v.chunkSize}).` });
  }
});

const CITATION_OPTIONS = [
  { value: 'inline', label: 'Inline', description: 'Numbered markers inside the answer.', icon: TextQuote },
  { value: 'footnotes', label: 'Footnotes', description: 'Source list below the answer.', icon: ListOrdered },
  { value: 'hidden', label: 'Hidden', description: 'Answers without visible citations.', icon: EyeOff }
];

export default function KnowledgeSettings() {
  useDocumentTitle('Knowledge settings');
  const state = useSettingsForm('knowledge', schema);
  const { register, control, formState: { errors } } = state.form;

  return (
    <SettingsFormCard state={state} icon={BookOpenText} title="Knowledge" description="How sources are split, retrieved and cited in answers. Chunking changes apply to sources processed or re-indexed after saving.">
      <SettingRow label="Supported source types" description="Types administrators can add." error={errors.supportedTypes?.message} group required>
        <Controller control={control} name="supportedTypes" render={({ field }) => {
          const value = field.value || [];
          const toggle = t => field.onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
          return (
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(SOURCE_TYPES).map(([t, { label }]) => {
                const on = value.includes(t);
                return (
                  <label key={t} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/25',
                    on ? 'border-primary/60 bg-primary-soft/40' : 'border-line hover:border-primary/40')}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(t)} onBlur={field.onBlur} />
                    <SourceTypeIcon type={t} size="sm" />
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">{label}</span>
                    <span className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border', on ? 'border-primary-strong bg-primary-strong text-primary-fg' : 'border-line bg-surface')} aria-hidden="true">
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        }} />
      </SettingRow>
      <SettingRow label="Default chunk size" description="Characters per chunk (200–4000)." error={errors.chunkSize?.message} required>
        <UnitInput type="number" inputMode="numeric" min={200} max={4000} step={50} suffix="chars" {...register('chunkSize', { valueAsNumber: true, deps: ['chunkOverlap'] })} />
      </SettingRow>
      <SettingRow label="Chunk overlap" description="Characters shared between neighbouring chunks (0–1000, below the chunk size)." error={errors.chunkOverlap?.message} required>
        <UnitInput type="number" inputMode="numeric" min={0} max={1000} step={10} suffix="chars" {...register('chunkOverlap', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Retrieval result count" description="Chunks retrieved per question (1–20)." error={errors.retrievalCount?.message} required>
        <UnitInput type="number" inputMode="numeric" min={1} max={20} step={1} suffix="chunks" {...register('retrievalCount', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Minimum similarity" description="Chunks scoring below this (0–0.95) are not used as evidence. Higher is stricter." error={errors.minSimilarity?.message} required>
        <UnitInput type="number" inputMode="decimal" min={0} max={0.95} step={0.01} {...register('minSimilarity', { valueAsNumber: true })} />
      </SettingRow>
      <SettingRow label="Citation display" description="How sources appear in user-facing answers." group>
        <Controller control={control} name="citationDisplay" render={({ field }) => (
          <RadioCards name={field.name} value={field.value} onChange={field.onChange} options={CITATION_OPTIONS} />
        )} />
      </SettingRow>
      <SettingRow label="Fallback response" description="Shown when no source supports an answer." error={errors.fallbackMessage?.message} required>
        <Textarea rows={3} className="max-w-xl" {...register('fallbackMessage')} />
      </SettingRow>
    </SettingsFormCard>
  );
}
