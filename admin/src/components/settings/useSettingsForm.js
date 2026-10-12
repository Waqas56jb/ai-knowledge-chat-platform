import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SETTINGS_ADAPTERS } from '../../services/settingsService';
import { useConfirm } from '../common/ConfirmDialog';
import { sectionById } from './sections';

const STORED_WHERE = {
  profile: 'Saved to your profile.',
  appearance: 'Saved in this browser.'
};

/**
 * Form state for one settings section (see SETTINGS_ADAPTERS for where each section lives).
 * - Loads the saved values once (later changes elsewhere do not overwrite unsaved edits).
 * - save(): sends the values → toast; the form becomes clean with the values the server returned.
 *   Server validation errors (error.details[].field) are shown on the matching fields.
 * - cancel(): back to the last saved values.
 * - resetToDefaults(): confirm → reset the section (not offered for the profile).
 * `onSaved(values)` runs after a save or reset.
 */
export function useSettingsForm(section, schema, { onSaved, toForm = v => v, fromForm = v => v } = {}) {
  const adapter = SETTINGS_ADAPTERS[section];
  const form = useForm({ resolver: zodResolver(schema), mode: 'onTouched' });
  const confirm = useConfirm();
  const [status, setStatus] = useState({ loading: true, error: null });
  const [saved, setSaved] = useState(null);
  const [resetting, setResetting] = useState(false);
  const onSavedRef = useRef(onSaved); onSavedRef.current = onSaved;
  const toFormRef = useRef(toForm); toFormRef.current = toForm;
  const fromFormRef = useRef(fromForm); fromFormRef.current = fromForm;
  const { reset, setError } = form;
  const label = sectionById(section)?.label || section;

  const apply = useCallback(values => { const v = toFormRef.current(values); setSaved(v); reset(v); return v; }, [reset]);

  const load = useCallback(() => {
    let alive = true;
    setStatus({ loading: true, error: null });
    adapter.load().then(
      values => { if (!alive) return; apply(values); setStatus({ loading: false, error: null }); },
      error => { if (alive) setStatus({ loading: false, error }); }
    );
    return () => { alive = false; };
  }, [adapter, apply]);
  useEffect(load, [load]);

  const save = form.handleSubmit(async values => {
    try {
      const result = await adapter.save(fromFormRef.current(values));
      const v = apply(result);
      onSavedRef.current?.(v);
      toast.success(`${label} settings saved.`, { description: STORED_WHERE[section] || 'Saved on the server and recorded in the audit log.' });
    } catch (err) {
      (Array.isArray(err.details) ? err.details : []).forEach(d => {
        const field = String(d.field || '').split('.')[0];
        if (field && field in values) setError(field, { message: d.message });
      });
      toast.error(err.message);
    }
  });

  const cancel = () => { if (saved) reset(saved); };

  const resetToDefaults = adapter.reset ? async () => {
    const ok = await confirm({
      title: `Reset ${label.toLowerCase()} settings?`,
      message: `Every ${label.toLowerCase()} setting returns to its default value. Other sections are not affected.`,
      confirmLabel: 'Reset to defaults', danger: true
    });
    if (!ok) return;
    setResetting(true);
    try {
      const v = apply(await adapter.reset());
      onSavedRef.current?.(v);
      toast.success(`${label} settings restored to defaults.`);
    } catch (err) { toast.error(err.message); } finally { setResetting(false); }
  } : null;

  return { form, loading: status.loading, error: status.error, reload: load, saved, save, cancel, resetToDefaults, resetting };
}
