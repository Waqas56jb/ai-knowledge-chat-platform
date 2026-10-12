import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { FormField, Input, Textarea } from '../forms/FormField';
import { getSourceById, updateSource } from '../../services/knowledgeService';
import { useQuery } from '../../hooks/useQuery';
import { normalizeVisibility } from '../../constants/domain';
import { requiredText } from '../../utils/validation';
import TagInput from './TagInput';
import VisibilityPicker from './VisibilityPicker';

export const sourceMetaSchema = z.object({
  title: requiredText('Title', 300),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
  tags: z.array(z.string()).max(20, 'Use at most 20 tags.'),
  visibility: z.enum(['workspace', 'restricted', 'private']),
  allowedUserIds: z.array(z.string())
}).superRefine((v, ctx) => {
  if (v.visibility === 'restricted' && !v.allowedUserIds.length) ctx.addIssue({ code: 'custom', path: ['allowedUserIds'], message: 'Choose at least one user, or pick a different visibility.' });
});

const toForm = s => ({ title: s?.title || '', description: s?.description || '', tags: s?.tags || [], visibility: normalizeVisibility(s?.visibility), allowedUserIds: s?.allowedUserIds || [] });

/** Edit a source's metadata (title, description, tags, visibility). */
export default function EditSourceModal({ source, open, onClose }) {
  // list rows do not include the allowed users of restricted sources: load the full record when needed
  const needsDetail = open && source && !source.allowedUserIds;
  const detail = useQuery(() => (needsDetail ? getSourceById(source.id) : Promise.resolve(null)), [needsDetail, source?.id]);
  const full = source && source.allowedUserIds ? source : detail.data && source && detail.data.id === source.id ? detail.data : null;
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(sourceMetaSchema), defaultValues: toForm(source) });

  useEffect(() => { if (open) reset(toForm(full || source)); }, [open, source?.id, full?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async v => {
    try {
      await updateSource(source.id, { title: v.title.trim(), description: v.description.trim(), tags: v.tags, visibility: v.visibility, allowedUserIds: v.visibility === 'restricted' ? v.allowedUserIds : [] });
      toast.success('Source details saved.');
      onClose();
    } catch (err) { toast.error(err.message); }
  };
  const visibility = watch('visibility');

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Edit source details" description="Changes apply immediately. Content and chunks are not re-processed."
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Save} type="submit" form="edit-source-form" loading={isSubmitting} disabled={!isDirty || (needsDetail && !full)}>Save changes</Button>
      </>}>
      <form id="edit-source-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Title" required error={errors.title?.message}><Input {...register('title')} maxLength={300} /></FormField>
        <FormField label="Description" optional error={errors.description?.message}><Textarea rows={3} {...register('description')} /></FormField>
        <Controller control={control} name="tags" render={({ field }) => (
          <FormField label="Tags" optional error={errors.tags?.message}><TagInput value={field.value} onChange={field.onChange} /></FormField>
        )} />
        <Controller control={control} name="visibility" render={({ field }) => (
          <Controller control={control} name="allowedUserIds" render={({ field: users }) => (
            <VisibilityPicker name="edit-visibility" value={field.value} onChange={field.onChange} allowedUserIds={users.value} onUsersChange={users.onChange}
              usersError={visibility === 'restricted' ? errors.allowedUserIds?.message : undefined} />
          )} />
        )} />
      </form>
    </Modal>
  );
}
