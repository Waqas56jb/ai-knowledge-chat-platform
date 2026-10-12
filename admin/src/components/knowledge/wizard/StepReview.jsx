import { Pencil } from 'lucide-react';
import { DescriptionList } from '../../common/Card';
import { SourceTypeIcon } from '../../common/Misc';
import { SOURCE_TYPES, VISIBILITY } from '../../../constants/domain';
import { getAllUsers } from '../../../services/userService';
import { useQuery } from '../../../hooks/useQuery';
import { formatBytes, formatNumber } from '../../../utils/format';
import { KINDS, conversationFileTitle, finalTags, resolveType, wordCount } from './wizardModel';
import { ConversationUploadList } from './ConversationFiles';
import { parseYouTubeUrl } from '../sourceUtils';

/** Step 4: read-only summary with "edit" shortcuts back to earlier steps. */
/** `uploads` = per-file status while conversation files are being uploaded (see ConversationUploadList). */
export default function StepReview({ form, onJump, uploads }) {
  const type = resolveType(form);
  const { data: users } = useQuery(() => (form.visibility === 'restricted' && form.allowedUserIds.length ? getAllUsers() : Promise.resolve([])), [form.visibility]);
  const names = form.allowedUserIds.map(id => (users || []).find(u => u.id === id)?.name || id);
  const tags = finalTags(form);
  const convFiles = form.kind === 'conversation' && form.conversationMode === 'files';
  const body = form.kind === 'text' ? form.text : form.kind === 'conversation' && !convFiles ? form.conversationText : '';
  if (uploads) return <ConversationUploadList items={uploads} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-subtle/40 p-4">
        <SourceTypeIcon type={type} size="lg" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink [overflow-wrap:anywhere]">{convFiles && form.conversationFiles.length > 1 ? `${form.conversationFiles.length} conversation files` : form.title || (convFiles && form.conversationFiles[0] ? conversationFileTitle(form, form.conversationFiles[0]) : 'Untitled')}</p>
          <p className="text-[13px] text-muted">{KINDS[form.kind].label} · {convFiles ? 'Uploaded file(s)' : SOURCE_TYPES[type]?.label}</p>
        </div>
      </div>

      <Section title="Source" onEdit={() => onJump(1)}>
        <DescriptionList columns={2} items={[
          ['Title', form.title || <span className="text-faint">{convFiles ? 'From the file names' : 'From YouTube'}</span>],
          ['Type', SOURCE_TYPES[type]?.label],
          ['Description', form.description || <span className="text-faint">None</span>],
          ['Tags', tags.length ? <span className="flex flex-wrap gap-1">{tags.map(t => <span key={t} className="badge badge-neutral">{t}</span>)}</span> : <span className="text-faint">None</span>],
          form.kind === 'youtube' && ['URL', <span key="u" className="break-all font-mono text-[12.5px]">{form.youtubeUrl}</span>],
          form.kind === 'youtube' && (parseYouTubeUrl(form.youtubeUrl)?.kind === 'channel'
            ? ['Videos', `Newest ${formatNumber(Number(form.maxVideos) || 0)} uploads · automatic captions`]
            : ['Transcript', form.transcript.trim() ? `Pasted · ${formatNumber(wordCount(form.transcript))} words` : 'Automatic captions']),
          form.kind === 'document' && ['File', `${form.file.name} · ${formatBytes(form.file.size)}`],
          form.kind === 'conversation' && ['Context', form.category],
          convFiles && ['Files', (
            <ul key="f" className="space-y-1">
              {form.conversationFiles.map(f => <li key={`${f.name}:${f.size}`} className="[overflow-wrap:anywhere]">{conversationFileTitle(form, f)} <span className="text-faint">· {f.name} · {formatBytes(f.size)}</span></li>)}
            </ul>
          )],
          form.kind === 'conversation' && ['Processing', 'Anonymised by AI and rewritten into reusable lessons; the original text and file are not kept.'],
          body && ['Content', `${formatNumber(body.length)} characters · ${formatNumber(wordCount(body))} words`]
        ]} />
        {body && <p className="mt-4 line-clamp-4 whitespace-pre-line rounded-xl bg-subtle/60 p-3 text-[13px] text-muted">{body}</p>}
      </Section>

      <Section title="Visibility" onEdit={() => onJump(2)}>
        <DescriptionList items={[
          ['Access', VISIBILITY[form.visibility]],
          form.visibility === 'restricted' && ['Allowed users', names.join(', ')]
        ]} />
      </Section>

    </div>
  );
}

function Section({ title, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint">{title}</h3>
        <button type="button" onClick={onEdit} className="link inline-flex items-center gap-1 text-[13px]"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit<span className="sr-only"> {title.toLowerCase()}</span></button>
      </div>
      {children}
    </section>
  );
}
