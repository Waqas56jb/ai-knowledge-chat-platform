import { useRef, useState } from 'react';
import { UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatBytes } from '../../../utils/format';
import Button from '../../common/Button';
import { FILE_TYPES, fileExt } from '../sourceUtils';
import { EXT_LABEL, titleFromName } from './wizardModel';

/**
 * Drag-and-drop file picker. The chosen File is kept in the form and uploaded as multipart `file`
 * to POST /admin/knowledge/documents when the source is added.
 */
export default function DocumentFields({ form, update, error, maxFileSizeMb, supportedTypes }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState('');
  const exts = Object.entries(EXT_LABEL).filter(([t]) => supportedTypes.includes(t));
  const accept = exts.map(([t, e]) => (t === 'markdown' ? '.md,.markdown' : e)).join(',');
  const { file } = form;

  const pick = list => {
    const f = list && list[0];
    if (!f) return;
    const type = FILE_TYPES[fileExt(f.name)];
    if (!type || !supportedTypes.includes(type)) { setLocalError(`“${f.name}” is not a supported file type. Use ${exts.map(([, e]) => e).join(', ')}.`); return; }
    if (f.size > maxFileSizeMb * 1024 * 1024) { setLocalError(`“${f.name}” is ${formatBytes(f.size)}, above the ${maxFileSizeMb} MB limit.`); return; }
    if (f.size === 0) { setLocalError(`“${f.name}” is empty.`); return; }
    setLocalError('');
    update(prev => ({ file: f, title: prev.title.trim() ? prev.title : titleFromName(f.name) }));
  };

  const open = () => inputRef.current && inputRef.current.click();
  const remove = () => { update({ file: null }); if (inputRef.current) inputRef.current.value = ''; };
  const shownError = localError || error;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="label mb-0" id="doc-file-label">File<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={e => pick(e.target.files)} />

      {!file ? (
        <div role="button" tabIndex={0} aria-labelledby="doc-file-label" aria-describedby="doc-file-help"
          onClick={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
          className={cn('flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20',
            drag ? 'border-primary bg-primary-soft/60' : shownError ? 'border-danger/50 bg-danger-soft/30' : 'border-line bg-subtle/40 hover:border-primary/50 hover:bg-primary-soft/30')}>
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary-text shadow-card"><UploadCloud className="h-5 w-5" aria-hidden="true" /></span>
          <p className="text-[14px] font-semibold text-ink">{drag ? 'Drop the file to add it' : 'Drag and drop a file here'}</p>
          <p className="mt-1 text-[13px] text-muted">or</p>
          <Button size="sm" className="mt-2" tabIndex={-1} onClick={e => { e.stopPropagation(); open(); }}>Browse files</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text"><FileText className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">{file.name}</p>
              <p className="text-[12.5px] text-muted">{formatBytes(file.size)} · {(FILE_TYPES[fileExt(file.name)] || '').toUpperCase()}</p>
            </div>
            <button type="button" onClick={remove} className="icon-btn icon-btn-sm" aria-label={`Remove ${file.name}`}><X aria-hidden="true" /></button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted" aria-live="polite">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />Ready to upload. The file is sent to the server when you add the source.
          </p>
        </div>
      )}
      <p id="doc-file-help" className="field-help">
        Supported: {exts.map(([, e]) => e).join(', ')} · Max {maxFileSizeMb} MB. The server extracts the text, then chunks and indexes it.
      </p>
      {shownError && <p className="field-error" role="alert">{shownError}</p>}
    </div>
  );
}
