import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, ListChecks, ShieldCheck, Cpu, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ErrorState, Skeleton } from '../../components/common/States';
import { useConfirm } from '../../components/common/ConfirmDialog';
import Stepper from '../../components/knowledge/wizard/Stepper';
import StepType from '../../components/knowledge/wizard/StepType';
import StepDetails from '../../components/knowledge/wizard/StepDetails';
import StepReview from '../../components/knowledge/wizard/StepReview';
import VisibilityPicker from '../../components/knowledge/VisibilityPicker';
import { STEPS, KINDS, conversationFileTitle, initialForm, isDirty, validateStep, toPayload } from '../../components/knowledge/wizard/wizardModel';
import { createKnowledgeSource, uploadConversationFiles } from '../../services/knowledgeService';
import { getMe } from '../../services/authService';
import { useDocumentTitle } from '../../hooks/useMisc';
import { useQuery } from '../../hooks/useQuery';

const COPY = {
  type: ['What are you adding?', 'Pick the kind of knowledge. You can change this until you add the source.'],
  details: ['Source information', 'Describe the source so administrators and the assistant can recognise it.'],
  visibility: ['Who can use it?', 'Choose which workspace members can get answers from this source.'],
  review: ['Review and add', 'Check the details. Adding the source queues a processing job on the server.']
};

/** Upload limit, default visibility and enabled source types come from the server (GET /auth/me → settings). */
const toSettings = me => ({
  maxFileSizeMb: me.settings.platform.maxFileSizeMb,
  defaultVisibility: me.settings.platform.defaultVisibility,
  supportedTypes: me.settings.knowledge.supportedTypes
});

export default function AddSourcePage() {
  useDocumentTitle('Add knowledge source');
  const { data: me, loading, error, reload } = useQuery(getMe, []);
  if (error) return <><BackLink /><Card><ErrorState error={error} onRetry={reload} title="Workspace settings could not be loaded" /></Card></>;
  if (loading || !me) return <><BackLink /><WizardSkeleton /></>;
  return <AddSourceWizard settings={toSettings(me)} />;
}

function BackLink() {
  return <Link to="/admin/knowledge" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Knowledge sources</Link>;
}

function WizardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="card card-pad space-y-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
    </div>
  );
}

function AddSourceWizard({ settings }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [form, setForm] = useState(() => {
    const f = initialForm(settings.defaultVisibility);
    const textTypes = KINDS.text.types.filter(t => settings.supportedTypes.includes(t));
    if (textTypes.length && !textTypes.includes(f.textType)) f.textType = textTypes[0];
    return f;
  });
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(null);
  const [uploads, setUploads] = useState(null); // per-file status while uploading conversation files
  const uploadsDone = !!uploads && uploads.every(u => u.status === 'done' || u.status === 'failed');
  const headingRef = useRef(null);
  const bodyRef = useRef(null);
  const firstRender = useRef(true);

  const update = patch => setForm(f => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
  const stepId = STEPS[step].id;
  const errors = attempted.has(stepId) ? validateStep(stepId, form, settings) : {};

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current && headingRef.current.focus();
  }, [step]);

  const goTo = i => { setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const next = () => {
    const errs = validateStep(stepId, form, settings);
    if (Object.keys(errs).length) {
      setAttempted(a => new Set(a).add(stepId));
      setTimeout(() => { const el = bodyRef.current?.querySelector('[aria-invalid="true"], [role="alert"]'); if (el && el.focus) el.focus(); }, 30);
      return;
    }
    goTo(step + 1);
  };

  const submit = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (Object.keys(validateStep(STEPS[i].id, form, settings)).length) { setAttempted(a => new Set(a).add(STEPS[i].id)); goTo(i); return; }
    }
    setSaving(true);
    setDuplicate(null);
    const payload = toPayload(form);
    if (payload.kind === 'conversationFiles') { await submitFiles(payload); return; }
    try {
      const { source } = await createKnowledgeSource(payload);
      toast.success('Source added.', { description: `"${source.title}" was saved and queued for processing.` });
      navigate(`/admin/knowledge/${source.id}`);
    } catch (err) {
      setSaving(false);
      if (err.status === 409 && err.details && err.details.existingSourceId) {
        setDuplicate({ id: err.details.existingSourceId, message: err.message });
        return;
      }
      toast.error(err.message);
    }
  };

  /** Upload each conversation file on its own; keep going on errors and show the result per file. */
  const submitFiles = async payload => {
    const { files } = payload;
    const base = { ...payload };
    delete base.files; delete base.kind;
    setUploads(files.map(file => ({ file, status: 'queued' })));
    const results = await uploadConversationFiles(files, base, {
      titleFor: file => conversationFileTitle(form, file),
      onUpdate: (i, patch) => setUploads(list => list.map((u, j) => (j === i ? { ...u, ...patch } : u)))
    });
    setSaving(false);
    const ok = results.filter(x => x.status === 'done');
    const failed = results.length - ok.length;
    if (results.length === 1 && ok.length === 1) {
      toast.success('Conversation uploaded.', { description: `"${ok[0].source.title}" is being anonymised and indexed.` });
      navigate(`/admin/knowledge/${ok[0].source.id}`);
      return;
    }
    if (!failed) toast.success(`${ok.length} conversations uploaded.`, { description: 'Each file is being anonymised and indexed as its own source.' });
    else if (ok.length) toast.warning(`${ok.length} of ${results.length} files uploaded.`, { description: `${failed} failed; see the list for details.` });
    else toast.error(results.length === 1 ? 'The file was not uploaded.' : 'No files were uploaded.', { description: results[0]?.error?.message });
  };

  /** After a partial failure: go back with only the failed files selected. */
  const editFailed = () => {
    const failedFiles = uploads.filter(u => u.status === 'failed').map(u => u.file);
    setUploads(null);
    update({ conversationFiles: failedFiles });
    goTo(1);
  };

  const cancel = async () => {
    if (isDirty(form) && !(await confirm({ title: 'Discard this source?', message: 'The information you entered will be lost.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return;
    navigate('/admin/knowledge');
  };

  const onSubmit = e => { e.preventDefault(); if (stepId === 'review') submit(); else next(); };
  const last = step === STEPS.length - 1;

  return (
    <>
      <BackLink />
      <PageHeader title="Add" accent="source" description="Bring a video, document or piece of business knowledge into the knowledge base." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div className="border-b border-line px-4 py-4 sm:px-6"><Stepper steps={STEPS} current={step} onJump={i => !saving && !uploads && goTo(i)} /></div>
          <form onSubmit={onSubmit} noValidate>
            <div ref={bodyRef} className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Step {step + 1} of {STEPS.length}</p>
              <h2 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-[19px] font-semibold text-ink outline-none">{COPY[stepId][0]}</h2>
              <p className="mb-5 mt-1 text-[13.5px] text-muted">{COPY[stepId][1]}</p>

              {stepId === 'type' && <StepType value={form.kind} onChange={kind => update({ kind })} supportedTypes={settings.supportedTypes} error={errors.kind} />}
              {stepId === 'details' && <StepDetails form={form} update={update} errors={errors} settings={settings} />}
              {stepId === 'visibility' && (
                <VisibilityPicker value={form.visibility} onChange={visibility => update({ visibility })} allowedUserIds={form.allowedUserIds}
                  onUsersChange={allowedUserIds => update({ allowedUserIds })} usersError={errors.allowedUserIds} />
              )}
              {stepId === 'review' && <StepReview form={form} onJump={goTo} uploads={uploads} />}
              {stepId === 'review' && duplicate && (
                <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <p className="text-ink"><b className="font-semibold">Already in the knowledge base.</b> <span className="text-muted">{duplicate.message}</span>{' '}
                    <Link className="link" to={`/admin/knowledge/${duplicate.id}`}>Open the existing source</Link></p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line bg-subtle/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {uploadsDone ? (
                <>
                  <span />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    {uploads.some(u => u.status === 'failed') && <Button icon={ArrowLeft} onClick={editFailed}>Retry failed files</Button>}
                    <Button variant="primary" as={Link} to="/admin/knowledge" iconRight={ArrowRight}>Go to knowledge sources</Button>
                  </div>
                </>
              ) : (<>
              <Button variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {step > 0 && <Button icon={ArrowLeft} onClick={() => goTo(step - 1)} disabled={saving}>Back</Button>}
                {last
                  ? <Button type="submit" variant="primary" icon={Plus} loading={saving}>{saving ? (form.kind === 'document' || uploads ? 'Uploading…' : 'Adding source…') : form.kind === 'conversation' && form.conversationMode === 'files' && form.conversationFiles.length > 1 ? `Upload ${form.conversationFiles.length} files` : 'Add source'}</Button>
                  : <Button type="submit" variant="primary" iconRight={ArrowRight}>Next: {STEPS[step + 1].label}</Button>}
              </div>
              </>)}
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card padded>
            <h2 className="card-title">What happens next</h2>
            <ol className="mt-3 space-y-3 text-[13px] text-muted">
              <li className="flex gap-3"><ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />The source is saved with status <b className="font-semibold text-ink">Pending</b>.</li>
              <li className="flex gap-3"><Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />The server extracts the text or transcript, chunks it and builds embeddings. Watch progress on the source page or in Processing.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />Visibility rules are enforced whenever the assistant answers a question.</li>
            </ol>
            <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-faint">Max file size {settings.maxFileSizeMb} MB (<Link className="link" to="/admin/settings/platform">Platform settings</Link>). Supported types are set in <Link className="link" to="/admin/settings/knowledge">Knowledge settings</Link>.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
