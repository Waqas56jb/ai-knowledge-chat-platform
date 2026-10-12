import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SCOPES, TYPES, TYPE_GROUP, TYPE_LABEL, groupOf } from '../data/config';
import { sourceService } from '../services/sourceService';
import { fmtDate, fmtDuration } from '../utils/format';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, Options, StatusBadge, TypeBadge } from '../components/common/ui';

const PAGE = 12;
export const thumbStyle = s => (s.youtube && s.youtube.thumbnail
  ? { backgroundImage: `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.38)), url("${s.youtube.thumbnail}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
  : undefined);

function SourceCard({ s }) {
  const g = groupOf(s);
  const passages = s.chunkCount != null ? <span><Icon name="align-left" />{s.chunkCount} passage{s.chunkCount === 1 ? '' : 's'}</span> : null;
  const meta = g === 'youtube' ? (s.channelName ? <span><Icon name="tv" />{s.channelName}</span> : passages)
    : g === 'document' ? <span><Icon name="file" />{TYPE_LABEL[s.type] || s.type}{s.chunkCount != null ? `, ${s.chunkCount} passages` : ''}</span>
    : passages;
  return (
    <article className="card scard">
      {g === 'youtube' && <div className="thumb" aria-hidden="true" style={thumbStyle(s)}><span className="play"><Icon name="play" /></span>{s.durationSeconds ? <span className="dur">{fmtDuration(s.durationSeconds)}</span> : null}</div>}
      <div className="sc-b">
        <div className="sc-top">{g !== 'youtube' && <span className={`sicon t-${g}`}><Icon name={TYPES[g].icon} /></span>}<div className="row gap8 wrap"><TypeBadge s={s} /><StatusBadge s={s} /></div></div>
        <h3><Link className="stretch" to={`/app/sources/${s.id}`}>{s.title}</Link></h3>
        {s.file && s.file.name && <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>{s.file.name}</p>}
        {s.description && <p className="muted clamp2" style={{ fontSize: 14 }}>{s.description}</p>}
        {s.tags && s.tags.length > 0 && <div className="tags">{s.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>}
        <div className="sc-m">{meta}<span><Icon name="calendar" />Added {fmtDate(s.createdAt)}</span>{g === 'youtube' && s.status === 'indexed' && <span><Icon name="check" />Transcript indexed</span>}</div>
      </div>
    </article>
  );
}

/** GET /sources?q=&type=&sort=&dir=&page=&pageSize= ; tab counts from meta.counts. */
export default function Sources() {
  const { ui, setUi } = useApp();
  const f = ui.src;
  const setF = patch => setUi(u => ({ src: { ...u.src, ...patch } }));
  const [state, setState] = useState({ status: 'loading', rows: [], page: 0, total: 0, pageCount: 0, counts: null, error: null });
  const [q, setQ] = useState(f.q);
  const reqId = useRef(0);

  useEffect(() => { const t = setTimeout(() => setQ(f.q), 300); return () => clearTimeout(t); }, [f.q]);

  const load = useCallback(async (page = 1) => {
    const id = ++reqId.current;
    setState(s => ({ ...s, status: page === 1 ? 'loading' : 'more', error: null }));
    try {
      const { data, meta } = await sourceService.list({ q, type: f.type, sort: f.sort, page, pageSize: PAGE });
      if (id !== reqId.current) return;
      const counts = { all: 0, youtube: 0, document: 0, text: 0, conversation: 0 };
      (meta.counts || []).forEach(c => { const g = TYPE_GROUP[c.type] || 'text'; counts[g] += c.n; counts.all += c.n; });
      setState(s => ({ status: 'ready', rows: page === 1 ? data : [...s.rows, ...data], page, total: meta.total, pageCount: meta.pageCount, counts, error: null }));
    } catch (error) { if (id === reqId.current) setState(s => ({ ...s, status: 'error', error })); }
  }, [q, f.type, f.sort]);
  useEffect(() => { load(1); }, [load]);

  const c = state.counts;
  const filtered = !!(f.q || f.type !== 'all');
  let list;
  if (state.status === 'loading' && !state.rows.length) list = <div className="sgrid">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skel" style={{ height: 230 }} />)}</div>;
  else if (state.status === 'error' && !state.rows.length) list = <div className="card"><ErrorState error={state.error} title="Could not load sources" onRetry={() => load(1)} /></div>;
  else if (!state.rows.length) list = filtered
    ? <div className="card"><EmptyState icon="search" title="No sources match" text="Try another search term or switch the source type."><button className="btn btn-out" onClick={() => setUi({ src: { q: '', type: 'all', sort: 'newest' } })}>Clear search and filters</button></EmptyState></div>
    : <div className="card"><EmptyState icon="library" title="No knowledge sources yet" text="Sources are added and indexed by your workspace administrators. Once they are ready, they appear here." /></div>;
  else list = (
    <>
      <div className="sgrid" style={state.status === 'loading' ? { opacity: 0.6 } : undefined}>{state.rows.map(s => <SourceCard key={s.id} s={s} />)}</div>
      {state.page < state.pageCount && <div className="more"><button className={`btn btn-out ${state.status === 'more' ? 'loading' : ''}`} disabled={state.status === 'more'} onClick={() => load(state.page + 1)}>Load more ({state.total - state.rows.length} remaining)</button></div>}
      {state.status === 'error' && <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>{state.error.message} <button className="link" onClick={() => load(state.page + 1)}>Try again</button></p>}
    </>
  );

  return (
    <div className="page">
      <div className="ph"><div><h1>Your Knowledge</h1><p>Explore the sources available to your workspace.</p></div><span className="badge"><Icon name="eye" />Read-only, managed by administrators</span></div>
      <div className="sum">{Object.keys(TYPES).map(t => <div className="card" key={t}><span className={`sicon t-${t}`}><Icon name={TYPES[t].icon} /></span><div><b>{c ? c[t] : '–'}</b><span>{TYPES[t].plural}</span></div></div>)}</div>
      <div className="fbar"><div className="tabs" role="tablist" aria-label="Source type">
        {SCOPES.map(([v, l]) => <button key={v} role="tab" aria-selected={f.type === v} onClick={() => setF({ type: v })}>{l}<span className="n">{c ? c[v] : ''}</span></button>)}
      </div></div>
      <div className="fbar">
        <div className="search"><Icon name="search" /><label className="sr" htmlFor="s-q">Search sources</label><input className="input" id="s-q" placeholder="Search titles, descriptions and tags" value={f.q} onChange={e => setF({ q: e.target.value })} /></div>
        <select className="select sm" value={f.sort} onChange={e => setF({ sort: e.target.value })} aria-label="Sort"><Options list={[['newest', 'Newest first'], ['oldest', 'Oldest first'], ['title', 'Title A to Z']]} /></select>
      </div>
      <div id="src-list">{list}</div>
    </div>
  );
}
