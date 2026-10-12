import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { conversationService } from '../services/conversationService';
import { rel } from '../utils/format';
import Icon from '../components/common/Icon';
import MenuWrap from '../components/common/MenuWrap';
import { EmptyState, ErrorState } from '../components/common/ui';

const PAGE = 20;
const OUTCOME = { insufficient_evidence: 'No evidence', out_of_scope: 'Out of scope', error: 'Not answered' };

/** GET /conversations?q=&page=&pageSize= with "Load more" pagination. */
export default function History() {
  const { ui, setUi, convVer, toast, promptDialog, confirmDialog, renameConv, deleteConv, resetNewChat } = useApp();
  const f = ui.hist;
  const setF = patch => setUi(u => ({ hist: { ...u.hist, ...patch } }));
  const [state, setState] = useState({ status: 'loading', rows: [], page: 0, total: 0, pageCount: 0, error: null });
  const [q, setQ] = useState(f.q); // debounced search text
  const reqId = useRef(0);

  useEffect(() => { const t = setTimeout(() => setQ(f.q), 300); return () => clearTimeout(t); }, [f.q]);

  const load = useCallback(async (page = 1) => {
    const id = ++reqId.current;
    setState(s => ({ ...s, status: page === 1 ? 'loading' : 'more', error: null }));
    try {
      const { data, meta } = await conversationService.list({ q, page, pageSize: PAGE });
      if (id !== reqId.current) return;
      setState(s => ({ status: 'ready', rows: page === 1 ? data : [...s.rows, ...data], page, total: meta.total, pageCount: meta.pageCount, error: null }));
    } catch (error) { if (id === reqId.current) setState(s => ({ ...s, status: 'error', error })); }
  }, [q]);
  useEffect(() => { load(1); }, [load, convVer]);

  const rename = c => promptDialog('Rename conversation', 'Title', c.title, v => {
    renameConv(c.id, v).then(() => toast('Conversation renamed.')).catch(e => toast(e.message, 'err'));
  });
  const remove = c => confirmDialog('Delete this conversation?', `"${c.title}" and its messages will be deleted from your account. This cannot be undone.`, 'Delete', () => {
    deleteConv(c.id).then(() => toast('Conversation deleted.')).catch(e => toast(e.message, 'err'));
  });

  let list;
  if (state.status === 'loading' && !state.rows.length) list = <div className="hlist">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 104 }} />)}</div>;
  else if (state.status === 'error' && !state.rows.length) list = <div className="card"><ErrorState error={state.error} title="Could not load your conversations" onRetry={() => load(1)} /></div>;
  else if (!state.rows.length && !q) list = <div className="card"><EmptyState icon="message-square" title="No conversations yet" text="Conversations you start are saved to your account and listed here."><Link className="btn btn-pri" to="/app/chat" onClick={resetNewChat}><Icon name="plus" />Start a new chat</Link></EmptyState></div>;
  else if (!state.rows.length) list = <div className="card"><EmptyState icon="search" title="No conversations match" text="Change the search text to see more conversations."><button className="btn btn-out" onClick={() => setF({ q: '' })}>Clear search</button></EmptyState></div>;
  else list = (
    <>
      <div className={`hlist ${f.view}`}>{state.rows.map(c => (
        <article className="card hitem" key={c.id}><span className="sicon t-document"><Icon name="message-square" /></span>
          <div className="b"><h3><Link className="stretch" to={`/app/chat/${c.id}`}>{c.title}</Link></h3><p className="clamp2">{conversationService.preview(c)}</p>
            <div className="mt"><span><Icon name="clock" />{rel(c.updatedAt)}</span><span><Icon name="quote" />{c.sourceCount || 0} source{c.sourceCount === 1 ? '' : 's'}</span><span><Icon name="message-square" />{c.messageCount || 0} messages</span>
              {OUTCOME[c.lastOutcome] && <span><Icon name="alert-circle" />{OUTCOME[c.lastOutcome]}</span>}</div></div>
          <MenuWrap trigger={p => <button className="icon-btn sm" aria-label={`Actions for ${c.title}`} {...p}><Icon name="more-vertical" /></button>}>
            <Link to={`/app/chat/${c.id}`}><Icon name="arrow-right" />Open</Link>
            <button onClick={() => rename(c)}><Icon name="pencil" />Rename</button><hr />
            <button className="danger" onClick={() => remove(c)}><Icon name="trash-2" />Delete</button>
          </MenuWrap>
        </article>
      ))}</div>
      {state.page < state.pageCount && <div className="more"><button className={`btn btn-out ${state.status === 'more' ? 'loading' : ''}`} disabled={state.status === 'more'} onClick={() => load(state.page + 1)}>Load more ({state.total - state.rows.length} remaining)</button></div>}
      {state.status === 'error' && <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>{state.error.message} <button className="link" onClick={() => load(state.page + 1)}>Try again</button></p>}
    </>
  );

  return (
    <div className="page">
      <div className="ph"><div><h1>Chat history</h1><p>{state.status === 'ready' && state.total ? `${state.total} conversation${state.total === 1 ? '' : 's'} saved to your account.` : 'Every conversation saved to your account.'}</p></div><Link className="btn btn-pri" to="/app/chat" onClick={resetNewChat}><Icon name="plus" />New chat</Link></div>
      <div className="fbar">
        <div className="search"><Icon name="search" /><label className="sr" htmlFor="h-q">Search conversations</label><input className="input" id="h-q" placeholder="Search titles and messages" value={f.q} onChange={e => setF({ q: e.target.value })} /></div>
        <div className="vt" role="group" aria-label="View">
          <button onClick={() => setF({ view: 'list' })} aria-pressed={f.view === 'list'} aria-label="List view"><Icon name="list" /></button>
          <button onClick={() => setF({ view: 'grid' })} aria-pressed={f.view === 'grid'} aria-label="Grid view"><Icon name="layout-grid" /></button>
        </div>
        {f.q && <button className="btn btn-sm btn-ghost" onClick={() => setF({ q: '' })}>Clear search</button>}
      </div>
      <div id="hist-list">{list}</div>
    </div>
  );
}
