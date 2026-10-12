import { useEffect, useState } from 'react';
import { Layers, FileText, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '../../common/Card';
import { EmptyState, ErrorState, Skeleton } from '../../common/States';
import { CopyButton } from '../../common/Misc';
import Button from '../../common/Button';
import { getSourceChunks } from '../../../services/knowledgeService';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { restructuredLabel } from '../sourceUtils';

const PAGE = 20;
const ts = s => (s == null ? null : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

/** Content tab: extracted text / transcript preview and the indexed chunks (GET /sources/:id/chunks). */
export default function SourceContent({ source: s, action }) {
  const isYt = s.type === 'youtube';
  const preview = s.content && s.content.preview;
  const conv = s.type === 'client_conversation';
  const r = conv ? s.restructured : null;
  return (
    <div className="space-y-6">
      {conv && (
        <p role="note" className="rounded-xl border border-primary/30 bg-primary-soft/60 px-4 py-3 text-[13px] text-muted">
          <b className="font-semibold text-ink">{r ? `${restructuredLabel(r)}${r.at ? ` on ${formatDateTime(r.at)}` : ''}.` : 'Not restructured yet.'}</b>{' '}
          This is the anonymised playbook that was indexed. The original conversation text and file are not kept.
        </p>
      )}
      <Card>
        <CardHeader title={isYt ? 'Transcript preview' : conv ? 'Anonymised playbook' : 'Content preview'} icon={FileText}
          description={s.content ? `${formatNumber(s.content.length)} characters${s.content.language ? ` · ${s.content.language}` : ''}${s.content.provider ? ` · ${s.content.provider}` : ''}${s.content.length > (preview || '').length ? ` · first ${formatNumber((preview || '').length)} shown` : ''}` : undefined}
          actions={preview ? <CopyButton text={preview} label="Copy text" /> : null} />
        <div className="card-pad">
          {preview
            ? <p className="max-h-80 overflow-y-auto whitespace-pre-line text-[14px] leading-relaxed text-ink">{preview}</p>
            : <p className="text-[13.5px] text-muted">{s.status === 'pending' || s.status === 'processing' ? 'The text appears once it has been extracted.' : s.status === 'failed' ? 'No text was extracted because processing failed.' : s.isChannel ? 'Channel sources have no text of their own; each discovered video is a separate source.' : 'No content preview is available for this source.'}</p>}
        </div>
      </Card>
      <ChunkList source={s} action={action} />
    </div>
  );
}

function ChunkList({ source: s, action }) {
  const [state, setState] = useState({ rows: [], total: 0, page: 0, loading: true, error: null });
  const load = page => {
    setState(st => ({ ...st, loading: true, error: null }));
    getSourceChunks(s.id, page, PAGE).then(
      ({ rows, meta }) => setState(st => ({ rows: page === 1 ? rows : [...st.rows, ...rows], total: meta.total ?? rows.length, page, loading: false, error: null })),
      error => setState(st => ({ ...st, loading: false, error }))
    );
  };
  // reload from the first page whenever indexing changes the chunk count
  useEffect(() => { load(1); }, [s.id, s.chunkCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const tokens = state.rows.reduce((n, c) => n + (c.tokenCount || 0), 0);
  return (
    <Card>
      <CardHeader title="Indexed chunks" icon={Layers}
        description={state.total ? `${formatNumber(state.total)} chunks · ${formatNumber(state.rows.length)} shown · ${formatNumber(tokens)} tokens shown` : undefined} />
      {state.error ? <ErrorState error={state.error} title="Chunks could not be loaded" onRetry={() => load(1)} className="py-8" />
        : state.loading && !state.rows.length ? (
          <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading chunks">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : state.rows.length ? (
          <>
            <ol className="divide-y divide-line">
              {state.rows.map(c => (
                <li key={c.id} className="flex gap-4 px-5 py-3.5">
                  <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-md bg-subtle px-1.5 font-mono text-[12px] font-semibold text-muted">#{c.index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{c.content}</p>
                    <p className="mt-1 text-[12px] text-faint">
                      {formatNumber(c.tokenCount || 0)} tokens
                      {c.pageNumber != null && <> · page {c.pageNumber}</>}
                      {c.startSeconds != null && <> · {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="link">{ts(c.startSeconds)}–{ts(c.endSeconds)}</a> : `${ts(c.startSeconds)}–${ts(c.endSeconds)}`}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {state.rows.length < state.total && (
              <div className="border-t border-line px-5 py-3">
                <Button size="sm" variant="ghost" icon={state.loading ? Loader2 : undefined} disabled={state.loading} onClick={() => load(state.page + 1)}>Show more chunks</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={Layers} compact title="No indexed chunks yet"
            description={s.status === 'processing' || s.status === 'pending' ? 'Chunks appear when processing completes.' : s.status === 'failed' ? 'Processing failed. Retry to generate chunks.' : 'Process this source to generate chunks.'}
            action={action} />
        )}
    </Card>
  );
}
