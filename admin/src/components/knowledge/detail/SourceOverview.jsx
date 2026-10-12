import { Link } from 'react-router-dom';
import { ExternalLink, ImageOff, History, ListVideo, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, DescriptionList } from '../../common/Card';
import StatusBadge from '../../common/StatusBadge';
import { ActivityTimeline, CopyButton } from '../../common/Misc';
import Avatar from '../../common/Avatar';
import Button from '../../common/Button';
import { VISIBILITY, sourceTypeLabel } from '../../../constants/domain';
import { actionLabel } from '../../../services/auditService';
import { formatBytes, formatDateTime, formatNumber, relativeTime } from '../../../utils/format';
import { restructuredLabel } from '../sourceUtils';

/** Overview tab: metadata, file / YouTube info, visibility and recent activity. */
export default function SourceOverview({ source: s }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader title="Details" />
          <div className="card-pad">
            <DescriptionList columns={2} items={[
              ['Owner', <span key="o" className="inline-flex items-center gap-2"><Avatar name={s.ownerName} size="xs" />{s.ownerName}</span>],
              ['Type', sourceTypeLabel(s.type)],
              ['Added', formatDateTime(s.createdAt)],
              ['Last updated', <span key="u" title={formatDateTime(s.updatedAt)}>{relativeTime(s.updatedAt)}</span>],
              ['Indexed', s.indexedAt ? <span key="i" title={formatDateTime(s.indexedAt)}>{relativeTime(s.indexedAt)}</span> : 'Not yet'],
              ['Indexed chunks', formatNumber(s.chunkCount || 0)],
              ['Status', <StatusBadge key="s" status={s.status} />],
              ['Description', s.description || <span className="text-faint">No description</span>],
              ['Tags', s.tags.length ? <span key="t" className="flex flex-wrap gap-1">{s.tags.map(t => <span key={t} className="badge badge-neutral">{t}</span>)}</span> : <span className="text-faint">No tags</span>],
              ['Source ID', <span key="id" className="inline-flex items-center gap-1 font-mono text-[12.5px]">{s.id}<CopyButton text={s.id} label="Copy source ID" iconOnly /></span>]
            ]} />
          </div>
        </Card>

        {s.type === 'client_conversation' && <ConversationPlaybookCard source={s} />}
        {s.type === 'youtube' && <YouTubeCard source={s} />}
        {s.isChannel && <ChannelVideos videos={s.channelVideos} />}
        {s.file && (
          <Card>
            <CardHeader title={s.type === 'client_conversation' ? 'Uploaded file' : 'File'}
              description={s.type === 'client_conversation' ? 'Only the name and size are recorded. The file itself is discarded after anonymisation and cannot be downloaded.' : undefined} />
            <div className="card-pad">
              <DescriptionList columns={2} items={[
                ['File name', <span key="n" className="break-all">{s.file.name}</span>],
                ['File type', s.file.type || sourceTypeLabel(s.type)],
                ['Size', formatBytes(s.file.size)],
                ['Extracted text', s.content ? `${formatNumber(s.content.length)} characters` : s.status === 'failed' ? 'Extraction failed' : 'Not extracted yet']
              ]} />
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Visibility" />
          <div className="card-pad">
            <p className="text-[14px] font-medium text-ink">{VISIBILITY[s.visibility] || s.visibility}</p>
            {s.visibility === 'restricted' && (
              s.allowedUsers.length
                ? <ul className="mt-3 space-y-2">{s.allowedUsers.map(u => <li key={u.id}><Link to={`/admin/users/${u.id}`} className="inline-flex items-center gap-2 text-[13.5px] text-ink hover:text-primary-text"><Avatar name={u.name || u.email} size="xs" />{u.name || u.email}</Link></li>)}</ul>
                : <p className="mt-2 text-[13px] text-warning">No users selected — only administrators can use this source.</p>
            )}
            {s.visibility === 'private' && <p className="mt-1 text-[13px] text-muted">Only administrators can see this source.</p>}
            {s.visibility === 'workspace' && <p className="mt-1 text-[13px] text-muted">Every active member can get answers from it.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" icon={History} />
          <div className="card-pad">
            <ActivityTimeline emptyText="No audit events for this source yet." items={(s.activity || []).slice(0, 6).map(a => ({
              id: a.id, title: actionLabel(a.action), description: [a.description, a.actorName].filter(Boolean).join(' · '), at: a.at, tone: a.result === 'failure' ? 'danger' : 'neutral'
            }))} />
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Client conversations are anonymised and rewritten into playbook lessons before indexing (metadata.restructured). */
function ConversationPlaybookCard({ source: s }) {
  const r = s.restructured;
  const busy = s.status === 'pending' || s.status === 'processing';
  return (
    <Card>
      <CardHeader title="Anonymised playbook" icon={ShieldCheck}
        description="Names, phone numbers and emails were removed and the conversation was rewritten into reusable negotiation and client-handling lessons. The original text and file are not kept." />
      <div className="card-pad">
        {r ? (
          <DescriptionList columns={2} items={[
            ['Result', <span key="r" className="font-medium">{restructuredLabel(r)}</span>],
            ['Restructured', r.at ? <span key="a" title={formatDateTime(r.at)}>{formatDateTime(r.at)}</span> : '—'],
            r.parts > 1 && ['Processed in', `${formatNumber(r.parts)} parts`],
            r.model && ['Model', <span key="m" className="font-mono text-[12.5px]">{r.model}</span>],
            s.metadata?.category && ['Context', s.metadata.category]
          ]} />
        ) : (
          <p className="text-[13.5px] text-muted">
            {busy ? 'Not restructured yet. The conversation is anonymised and rewritten into lessons while it is processed.'
              : s.status === 'failed' ? 'Restructuring did not complete. See the error above; nothing from the original conversation was indexed.'
                : 'No restructuring details were recorded for this source.'}
          </p>
        )}
      </div>
    </Card>
  );
}

function YouTubeCard({ source: s }) {
  const y = s.youtube || {};
  const [failed, setFailed] = useState(false);
  const transcript = s.content
    ? [y.transcriptProvider || s.content.provider, y.transcriptLanguage || s.content.language, y.autoGenerated ? 'auto-generated' : null].filter(Boolean).join(' · ') || 'Available'
    : s.status === 'failed' ? 'Unavailable' : 'Not fetched yet';
  return (
    <Card>
      <CardHeader title={s.isChannel ? 'YouTube channel' : 'YouTube'} />
      <div className="card-pad flex flex-col gap-5 md:flex-row">
        {y.thumbnail && !failed
          ? <img src={y.thumbnail} alt={`Thumbnail for ${s.title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="aspect-video w-full rounded-xl bg-subtle object-cover md:w-64" />
          : <span className="grid aspect-video w-full place-items-center rounded-xl bg-subtle text-faint md:w-64"><ImageOff className="h-5 w-5" aria-hidden="true" /><span className="sr-only">No thumbnail</span></span>}
        <div className="min-w-0 flex-1">
          <DescriptionList columns={2} items={[
            [s.isChannel ? 'Channel' : 'Video title', s.title],
            ['Channel', s.channelName || '—'],
            !s.isChannel && ['Duration', s.durationLabel || '—'],
            !s.isChannel && ['Transcript', transcript],
            ['Chunks', formatNumber(s.chunkCount || 0)],
            ['Status', <StatusBadge key="s" status={s.status} />]
          ].filter(Boolean)} />
          {s.url && (
            <div className="mt-4">
              <p className="text-[12px] font-medium uppercase tracking-wide text-faint">Public URL</p>
              <p className="mt-0.5 break-all font-mono text-[12.5px] text-ink">{s.url}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton text={s.url} label="Copy URL" />
                <Button size="sm" as="a" href={s.url} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open on YouTube</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ChannelVideos({ videos }) {
  return (
    <Card>
      <CardHeader title="Channel videos" icon={ListVideo} description={videos.length ? `${formatNumber(videos.length)} videos discovered` : 'Videos appear once channel discovery finishes.'} />
      {videos.length > 0 && (
        <ul className="divide-y divide-line">
          {videos.map(v => (
            <li key={v.id}>
              <Link to={`/admin/knowledge/${v.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-subtle/60">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{v.title}</span>
                <span className="text-[12px] tabular-nums text-faint">{formatNumber(v.chunkCount || 0)} chunks</span>
                <StatusBadge status={v.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
