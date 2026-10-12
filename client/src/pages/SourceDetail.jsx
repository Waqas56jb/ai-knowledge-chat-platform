import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TYPE_LABEL, groupOf } from '../data/config';
import { sourceService } from '../services/sourceService';
import { fmtDate, fmtDuration, fmtSize, rel } from '../utils/format';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, StatusBadge, TypeBadge } from '../components/common/ui';
import { thumbStyle } from './Sources';

const CHUNKS = 20;
const DOC_TYPES = ['pdf', 'docx', 'txt', 'markdown'];
const segLoc = c => (c.startSeconds != null ? fmtDuration(c.startSeconds) : c.pageNumber ? 'Page ' + c.pageNumber : '');

/** GET /sources/:id, GET /sources/:id/chunks (paged), GET /sources/:id/download for documents. */
export default function SourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setUi, toast } = useApp();
  const [src, setSrc] = useState({ status: 'loading', data: null, error: null });
  const [ch, setCh] = useState({ status: 'loading', rows: [], page: 0, pageCount: 0, total: 0, error: null });
  const [dl, setDl] = useState(false);

  const loadSource = useCallback(() => {
    setSrc({ status: 'loading', data: null, error: null });
    sourceService.get(id).then(data => setSrc({ status: 'ready', data, error: null })).catch(error => setSrc({ status: 'error', data: null, error }));
  }, [id]);
  const loadChunks = useCallback(async (page = 1) => {
    setCh(c => ({ ...c, status: page === 1 ? 'loading' : 'more', error: null, ...(page === 1 ? { rows: [] } : {}) }));
    try {
      const { data, meta } = await sourceService.chunks(id, { page, pageSize: CHUNKS });
      setCh(c => ({ status: 'ready', rows: page === 1 ? data : [...c.rows, ...data], page, pageCount: meta ? meta.pageCount : 1, total: meta ? meta.total : data.length, error: null }));
    } catch (error) { setCh(c => ({ ...c, status: 'error', error })); }
  }, [id]);
  useEffect(() => { loadSource(); loadChunks(1); }, [loadSource, loadChunks]);

  if (src.status === 'loading') return (
    <div className="page"><div className="skel" style={{ height: 18, width: 140, marginBottom: 22 }} /><div className="skel" style={{ height: 70, marginBottom: 22 }} />
      <div className="det"><div className="skel" style={{ height: 320 }} /><div className="skel" style={{ height: 320 }} /></div></div>
  );
  if (src.status === 'error') return (
    <div className="page card">{src.error.status === 404 || src.error.status === 403
      ? <EmptyState icon="file-text" title="Source not found" text="This source is not available to you. It may have been removed, or the link is incorrect."><Link className="btn btn-pri" to="/app/sources">Back to sources</Link></EmptyState>
      : <ErrorState error={src.error} title="Could not load this source" onRetry={loadSource} />}</div>
  );

  const s = src.data, g = groupOf(s);
  const linked = s.linkedConversations || [];
  const canDownload = DOC_TYPES.includes(s.type) && !!s.file;
  const byTag = t => { setUi({ src: { q: t, type: 'all', sort: 'newest' } }); navigate('/app/sources'); };
  const download = async () => {
    setDl(true);
    try { const r = await sourceService.download(s.id); window.open(r.url, '_blank', 'noopener,noreferrer'); }
    catch (e) { toast(e.message, 'err'); }
    setDl(false);
  };
  const segUrl = c => c.url || (s.url && c.startSeconds != null && g === 'youtube' ? s.url + (s.url.includes('?') ? '&' : '?') + 't=' + Math.floor(c.startSeconds) + 's' : null);

  return (
    <div className="page">
      <Link className="link" to="/app/sources" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 16 }}><Icon name="arrow-left" />Back to sources</Link>
      <div className="ph"><div style={{ minWidth: 0 }}><div className="row gap8 wrap" style={{ marginBottom: 10 }}><TypeBadge s={s} /><StatusBadge s={s} /></div><h1 style={{ overflowWrap: 'anywhere' }}>{s.title}</h1>{s.description && <p>{s.description}</p>}</div>
        {g === 'youtube' && s.url && <a className="btn btn-out" href={s.url} target="_blank" rel="noopener noreferrer"><Icon name="external-link" />Open on YouTube</a>}
        {canDownload && <button className={`btn btn-out ${dl ? 'loading' : ''}`} onClick={download} disabled={dl}><Icon name="file" />Download</button>}</div>
      <div className="det">
        <div className="stack">
          {g === 'youtube' && <div className="card" style={{ overflow: 'hidden' }}><div className="thumb" style={{ aspectRatio: '16/6', ...thumbStyle(s) }} aria-hidden="true"><span className="play"><Icon name="play" /></span>{s.durationSeconds ? <span className="dur">{fmtDuration(s.durationSeconds)}</span> : null}</div></div>}
          <section className="card blk"><div className="blk-h"><h2>{g === 'youtube' ? 'Transcript segments' : g === 'conversation' ? 'Conversation excerpts' : 'Text excerpts'}</h2>{ch.total > 0 && <span className="badge">{ch.total} passages</span>}</div>
            {ch.status === 'loading' ? [0, 1, 2].map(i => <div key={i} className="skel" style={{ height: 48, margin: '10px 0' }} />)
              : ch.status === 'error' && !ch.rows.length ? <ErrorState error={ch.error} title="Could not load the excerpts" onRetry={() => loadChunks(1)} />
              : ch.rows.length ? <>
                {ch.rows.map(c => { const loc = segLoc(c), url = segUrl(c); return (
                  <div className="seg" id={`ex-${c.id}`} key={c.id}>
                    {url && loc ? <a className="ts" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open video at ${loc}`}>{loc}</a> : loc ? <span className="ts">{loc}</span> : null}
                    <p>{c.content}</p></div>
                ); })}
                {ch.page < ch.pageCount && <div className="more"><button className={`btn btn-out btn-sm ${ch.status === 'more' ? 'loading' : ''}`} disabled={ch.status === 'more'} onClick={() => loadChunks(ch.page + 1)}>Show more ({ch.total - ch.rows.length} remaining)</button></div>}
              </>
              : <EmptyState icon="clock" title={s.status === 'indexed' ? 'No excerpts' : 'Not indexed yet'} text={s.status === 'indexed' ? 'This source has no searchable passages.' : 'Excerpts appear here once the source has been processed and indexed.'} />}
          </section>
          <section className="card blk"><div className="blk-h"><h2>Linked conversations</h2></div>
            {linked.length ? linked.map(c => <div className="li" key={c.id}><span className="sicon t-document"><Icon name="message-square" /></span><div className="b"><h3 className="trunc"><Link className="stretch" to={`/app/chat/${c.id}`}>{c.title}</Link></h3><p>{rel(c.updatedAt)}</p></div><Icon name="chevron-right" /></div>)
              : <p className="muted">None of your conversations has cited this source yet.</p>}
          </section>
        </div>
        <aside className="card blk"><div className="blk-h"><h2>Details</h2></div>
          <dl className="kv"><dt>Type</dt><dd>{TYPE_LABEL[s.type] || s.type}</dd>
            {s.channelName && <><dt>Channel</dt><dd>{s.channelName}</dd></>}
            {s.durationSeconds ? <><dt>Duration</dt><dd>{fmtDuration(s.durationSeconds)}</dd></> : null}
            {s.youtube && s.youtube.transcriptLanguage && <><dt>Transcript</dt><dd>{s.youtube.transcriptLanguage}{s.youtube.autoGenerated ? ', auto-generated' : ''}</dd></>}
            {s.file && <><dt>File name</dt><dd style={{ overflowWrap: 'anywhere' }}>{s.file.name}</dd>{s.file.size != null && <><dt>File size</dt><dd>{fmtSize(s.file.size)}</dd></>}</>}
            {s.ownerName && <><dt>Added by</dt><dd>{s.ownerName}</dd></>}
            <dt>Added</dt><dd>{fmtDate(s.createdAt)}</dd>
            {s.indexedAt && <><dt>Indexed</dt><dd>{fmtDate(s.indexedAt)}</dd></>}
            <dt>Status</dt><dd style={{ textTransform: 'capitalize' }}>{s.status}</dd>
            <dt>Passages</dt><dd>{s.chunkCount != null ? s.chunkCount : ch.total}</dd></dl>
          {s.tags && s.tags.length > 0 && <><h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Related topics</h3>
            <div className="tags">{s.tags.map(t => <button className="tag" key={t} onClick={() => byTag(t)}>{t}</button>)}</div></>}
          <Link className="btn btn-pri btn-sm block" style={{ marginTop: 20 }} to="/app/chat" onClick={() => setUi({ draft: `What are the key points in "${s.title}"?` })}><Icon name="message-square" />Ask about this source</Link>
        </aside>
      </div>
    </div>
  );
}
