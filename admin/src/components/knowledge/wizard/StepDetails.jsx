import { useState } from 'react';
import { CheckCircle2, ClipboardPaste, ImageOff, Upload, Youtube } from 'lucide-react';
import { FormField, Input, Textarea, Select } from '../../forms/FormField';
import { Segmented } from '../../common/Tabs';
import { SOURCE_TYPES } from '../../../constants/domain';
import { formatNumber } from '../../../utils/format';
import TagInput from '../TagInput';
import { parseYouTubeUrl, ytThumbnail } from '../sourceUtils';
import DocumentFields from './DocumentFields';
import ConversationFiles from './ConversationFiles';
import { Notice } from '../../common/Misc';
import { CONVERSATION_CATEGORIES, wordCount } from './wizardModel';

/** Step 2: fields for the chosen source kind, plus shared title / description / tags. */
export default function StepDetails({ form, update, errors, settings }) {
  const set = k => e => update({ [k]: e.target.value });
  const convFiles = form.kind === 'conversation' && form.conversationMode === 'files';
  const titleHelp = form.kind === 'youtube' ? 'Leave empty to use the video or channel title from YouTube.'
    : convFiles ? `Optional. Leave empty for “Client conversation · context · date”${form.conversationFiles.length > 1 ? '; each file gets “(1 of N)”' : ''}. Titles are not anonymised, so do not include client names.`
      : form.kind === 'conversation' ? 'Titles are not anonymised, so do not include client names.' : undefined;
  const meta = (
    <>
      <FormField label={form.kind === 'conversation' ? 'Conversation title' : 'Title'} required={form.kind !== 'youtube' && !convFiles} optional={form.kind === 'youtube' || convFiles} error={errors.title}
        help={titleHelp}>
        <Input value={form.title} onChange={set('title')} maxLength={300} placeholder={form.kind === 'conversation' ? 'e.g. Call notes: renewal pricing' : 'A clear, descriptive title'} />
      </FormField>
      <FormField label="Description" optional error={errors.description} help="Shown to administrators and used as context for answers.">
        <Textarea rows={3} value={form.description} onChange={set('description')} placeholder="What does this source cover?" />
      </FormField>
      <FormField label="Tags" optional>
        <TagInput value={form.tags} onChange={tags => update({ tags })} />
      </FormField>
    </>
  );

  if (form.kind === 'youtube') return (
    <div className="space-y-5">
      <YouTubeUrlField form={form} update={update} error={errors.youtubeUrl} />
      {meta}
      {parseYouTubeUrl(form.youtubeUrl)?.kind === 'channel' ? (
        <FormField label="Videos to index" required error={errors.maxVideos}
          help="The newest uploads, up to 500. Each video becomes its own source. Re-process the channel later to add new uploads.">
          <Input type="number" min={1} max={500} step={1} value={form.maxVideos} onChange={set('maxVideos')} className="max-w-[10rem]" />
        </FormField>
      ) : (
      <FormField label="Transcript" optional error={errors.transcript}
        help={`Paste the transcript to skip automatic captions (for example when a video has captions disabled). ${form.transcript ? `${formatNumber(form.transcript.length)} characters · ${formatNumber(wordCount(form.transcript))} words.` : ''}`}>
        <Textarea rows={6} value={form.transcript} onChange={set('transcript')} placeholder="Optional. Paste the video transcript here…" className="font-mono text-[13.5px]" />
      </FormField>
      )}
    </div>
  );
  if (form.kind === 'document') return (
    <div className="space-y-5">
      <DocumentFields form={form} update={update} error={errors.file} maxFileSizeMb={settings.maxFileSizeMb} supportedTypes={settings.supportedTypes} />
      {meta}
    </div>
  );
  if (form.kind === 'text') {
    const textTypes = ['business_knowledge', 'markdown', 'txt'].filter(t => settings.supportedTypes.includes(t));
    return (
      <div className="space-y-5">
        {meta}
        {textTypes.length > 1 && (
          <div>
            <span className="label" id="text-format-label">Format</span>
            <Segmented label="Text format" value={form.textType} onChange={v => update({ textType: v })} options={textTypes.map(t => [t, SOURCE_TYPES[t].label])} />
          </div>
        )}
        <ContentEditor label="Content" value={form.text} onChange={v => update({ text: v })} error={errors.text}
          placeholder={form.textType === 'markdown' ? '# Heading\n\nWrite your content in Markdown…' : 'Paste or write the knowledge content…'} />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Notice title="Privacy" tone="primary">
        Conversations are anonymised by AI (names, phone numbers and emails removed) and rewritten into reusable negotiation and client-handling lessons before indexing. The original text and file are not kept.
      </Notice>
      <div>
        <span className="label" id="conv-mode-label">How do you want to add it?</span>
        <Segmented label="How do you want to add the conversation" value={form.conversationMode} onChange={v => update({ conversationMode: v })}
          options={[['paste', 'Paste text', ClipboardPaste], ['files', 'Upload file(s)', Upload]]} />
      </div>
      {convFiles && (
        <ConversationFiles files={form.conversationFiles} onChange={conversationFiles => update({ conversationFiles })} error={errors.conversationFiles} maxFileSizeMb={settings.maxFileSizeMb} />
      )}
      {meta}
      <FormField label="Context" required error={errors.category} help="Saved as a tag so the conversation can be filtered later.">
        <Select value={form.category} onChange={set('category')} placeholder="Choose a context" options={CONVERSATION_CATEGORIES} />
      </FormField>
      {!convFiles && <ContentEditor label="Conversation text" value={form.conversationText} onChange={v => update({ conversationText: v })} error={errors.conversationText}
        placeholder={'Paste call notes, an email thread or a chat transcript…\n\nClient: …\nUs: …'} />}
    </div>
  );
}

function ContentEditor({ label, value, onChange, error, placeholder }) {
  return (
    <FormField label={label} required error={error} help={`${formatNumber(value.length)} characters · ${formatNumber(wordCount(value))} words`}>
      <Textarea rows={12} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-h-[240px] font-mono text-[13.5px]" />
    </FormField>
  );
}

function YouTubeUrlField({ form, update, error }) {
  const parsed = parseYouTubeUrl(form.youtubeUrl);
  const [imgFailed, setImgFailed] = useState(null);
  return (
    <div className="space-y-3">
      <FormField label="Video or channel URL" required error={error} help="youtube.com/watch?v=…, youtu.be/…, /shorts/…, youtube.com/@handle or /channel/…">
        <Input type="url" inputMode="url" value={form.youtubeUrl} onChange={e => update({ youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" autoComplete="off" />
      </FormField>
      {parsed && (
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-subtle/40 p-3 sm:flex-row sm:items-center">
          {parsed.kind === 'video' ? (
            imgFailed === parsed.videoId
              ? <span className="grid aspect-video w-full shrink-0 place-items-center rounded-xl bg-subtle text-faint sm:w-48"><ImageOff className="h-5 w-5" aria-hidden="true" /></span>
              : <img src={ytThumbnail(parsed.videoId)} alt="Video thumbnail preview" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgFailed(parsed.videoId)}
                  className="aspect-video w-full shrink-0 rounded-xl bg-subtle object-cover sm:w-48" />
          ) : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"><Youtube className="h-6 w-6" aria-hidden="true" /></span>}
          <div className="min-w-0 text-[13px]">
            <p className="flex items-center gap-1.5 font-semibold text-ink"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />{parsed.kind === 'video' ? 'Video URL recognised' : 'Channel URL recognised'}</p>
            <p className="mt-0.5 break-all text-muted">{parsed.kind === 'video' ? <>Video ID <code className="kbd">{parsed.videoId}</code></> : <>Channel <code className="kbd">{parsed.handle}</code></>}</p>
            <p className="mt-1.5 text-[12px] text-faint">{parsed.kind === 'channel' ? 'The server discovers the channel’s videos and indexes each transcript.' : 'The server fetches the transcript and video details when you add it.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
