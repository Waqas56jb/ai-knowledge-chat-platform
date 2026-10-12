import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NEW_CHAT, useApp } from '../context/AppContext';
import { TYPES } from '../data/config';
import Icon from '../components/common/Icon';
import Logo from '../components/common/Logo';
import MenuWrap from '../components/common/MenuWrap';
import { EmptyState, ErrorState } from '../components/common/ui';
import Composer from '../components/chat/Composer';
import Message from '../components/chat/Message';
import SourcePanel from '../components/chat/SourcePanel';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ui, setUi, settings, pending, threads, loadThread, send, toast, promptDialog, confirmDialog, composerRef,
    renameConv, deleteConv, resetNewChat, suggest, loadSuggestions, canChat } = useApp();
  const msgsRef = useRef(null);
  const pinned = useRef(true); // follow new text only while the reader is at the bottom
  const key = id || NEW_CHAT;
  const t = threads[key];
  const c = id ? (t && t.conv) || null : null;
  const busy = pending.has(key);
  const msgs = (t && t.messages) || [];
  const tail = msgs.length ? (msgs[msgs.length - 1].content || '').length : 0;
  const streaming = busy && msgs.length > 0 && !!msgs[msgs.length - 1].streaming;
  const stage = (t && t.stage) || 'searching';

  useEffect(() => { if (id) loadThread(id); }, [id, loadThread]);
  useEffect(() => { if (!id) loadSuggestions(); }, [id, loadSuggestions]);
  useEffect(() => { pinned.current = true; }, [id, msgs.length]);
  useEffect(() => { const ms = msgsRef.current; if (ms && pinned.current) ms.scrollTop = ms.scrollHeight; }, [id, msgs.length, busy, tail]);
  const onScroll = e => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };
  useEffect(() => {
    if (!ui.panel) return;
    const onKey = e => { if (e.key === 'Escape') setUi({ panel: null }); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ui.panel, setUi]);

  if (id && t && t.error && !t.messages.length) return (
    <div className="page" style={{ padding: 28 }}><div className="card">
      {t.error.status === 404
        ? <EmptyState icon="message-square" title="Conversation not found" text="It may have been deleted, or it belongs to another account."><Link className="btn btn-pri" to="/app/chat" onClick={resetNewChat}>Start a new chat</Link></EmptyState>
        : <ErrorState error={t.error} title="Could not load this conversation" onRetry={() => loadThread(id, true)} />}
    </div></div>
  );

  const openCite = (m, n) => { const cite = (m.citations || []).find(x => x.n === n); if (cite) setUi({ panel: { ...cite } }); };
  const editMsg = m => {
    setUi({ draft: m.content });
    setTimeout(() => composerRef.current && composerRef.current.focus(), 0);
    toast('Edit your question and send it again.', 'info');
  };
  const rename = () => c && promptDialog('Rename conversation', 'Title', c.title, v => {
    renameConv(c.id, v).then(() => toast('Conversation renamed.')).catch(e => toast(e.message, 'err'));
  });
  const remove = () => c && confirmDialog('Delete this conversation?', `"${c.title}" and its messages will be deleted from your account. This cannot be undone.`, 'Delete', () => {
    deleteConv(c.id).then(() => { toast('Conversation deleted.'); navigate('/app/chat'); }).catch(e => toast(e.message, 'err'));
  });

  let body;
  if (id && (!t || (t.loading && !msgs.length))) {
    body = <div className="msgs-in" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="skel" style={{ height: i % 2 ? 120 : 54, margin: '0 0 18px', width: i % 2 ? '100%' : '60%', marginLeft: i % 2 ? 0 : 'auto' }} />)}</div>;
  } else if (msgs.length) {
    const last = msgs[msgs.length - 1];
    const fups = !busy && canChat && settings.showFollowups && last.role === 'assistant' && Array.isArray(last.followups) ? last.followups : [];
    body = (
      <div className="msgs-in">
        {msgs.map((m, i) => <Message key={m.id} m={m} convId={id} busy={busy} isLast={i === msgs.length - 1} onCite={n => openCite(m, n)} onEdit={editMsg} />)}
        {busy && !streaming && <div className="m m-ai" role="status"><span className="mark"><Logo size={30} /></span><div><div className="typing"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>{stage === 'writing' ? 'Writing the answer…' : 'Searching your knowledge sources…'}</span></div></div></div>}
        {fups.length > 0 && <div className="fups">{fups.map(q => <button key={q} className="sug" onClick={() => send(q, id)}>{q}</button>)}</div>}
      </div>
    );
  } else if (id) {
    body = <div className="msgs-in chat-empty"><Logo size={48} /><h2>No messages <em>yet.</em></h2><p>Ask a question below to start this conversation.</p></div>;
  } else {
    const icons = it => TYPES[it.group].icon;
    body = (
      <div className="msgs-in chat-empty"><Logo size={48} /><h2>What would you like to <em>explore?</em></h2>
        <p>Ask about sourcing, pricing, pharmacies, ads, hiring or scaling. Answers come from the expert library, with sources alongside.</p>
        {suggest.status === 'loading' && <div className="pgrid">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 64 }} />)}</div>}
        {suggest.status === 'ready' && suggest.items.length > 0 && <div className="pgrid">{suggest.items.map(s => <button key={s.id} onClick={() => send(s.prompt, null)} disabled={!canChat}><Icon name={icons(s)} /><span>{s.prompt}</span></button>)}</div>}
        {suggest.status === 'ready' && !suggest.items.length && <p className="muted" style={{ fontSize: 14 }}>No knowledge sources are indexed yet. Once an administrator adds sources, suggested questions appear here.</p>}
        {suggest.status === 'error' && <p className="muted" style={{ fontSize: 14 }}>Suggestions could not be loaded. <button className="link" onClick={() => loadSuggestions(true)}>Try again</button></p>}
      </div>
    );
  }

  return (
    <div className={`chat ${ui.panel ? 'has-panel' : ''}`} id="chat">
      <section className="chat-main">
        <div className="chat-head">
          {c ? <button className="ttl" onClick={rename} aria-label="Rename conversation"><h1 className="trunc" id="chat-title">{c.title}</h1><Icon name="pencil" /></button> : <h1>{id ? 'Conversation' : 'New chat'}</h1>}
          <span className="grow" />
          <Link className="btn btn-sm btn-out" to="/app/chat" onClick={resetNewChat}><Icon name="plus" /><span>New chat</span></Link>
          {c && <MenuWrap trigger={p => <button className="icon-btn" aria-label="Conversation actions" {...p}><Icon name="more-vertical" /></button>}>
            <button onClick={rename}><Icon name="pencil" />Rename</button><Link to="/app/history"><Icon name="history" />Open chat history</Link><hr />
            <button className="danger" onClick={remove}><Icon name="trash-2" />Delete</button>
          </MenuWrap>}
        </div>
        <div className="msgs" id="msgs" role="log" aria-live="polite" aria-busy={streaming} ref={msgsRef} onScroll={onScroll}>{body}</div>
        <div className="comp-wrap"><div className="comp-in"><Composer placeholder={id ? 'Ask a follow-up' : 'Ask a business question'} currentId={id || null} autoFocus /></div></div>
      </section>
      <aside className="spanel" id="spanel" aria-label="Source details"><SourcePanel panel={ui.panel} onClose={() => setUi({ panel: null })} /></aside>
    </div>
  );
}
