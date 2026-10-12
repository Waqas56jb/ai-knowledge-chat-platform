import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { conversationService } from '../../services/conversationService';
import { notificationService } from '../../services/notificationService';
import { ROLE_LABEL } from '../../data/config';
import { store } from '../../utils/storage';
import { initials, rel } from '../../utils/format';
import Icon from '../common/Icon';
import { BrandMark } from '../common/Logo';
import MenuWrap from '../common/MenuWrap';

const NAV = [['/app', 'layout-dashboard', 'Overview'], ['/app/history', 'history', 'Chat History'], ['/app/sources', 'library', 'Knowledge Sources'], ['/app/settings', 'settings', 'Settings']];
const NOTIF_ICON = { source: 'file-text', invitation: 'mail', conversation: 'message-square', job: 'clock', system: 'info' };
const notifIcon = type => NOTIF_ICON[String(type || '').split(/[._]/)[0]] || 'bell';

function crumbFor(parts, threads) {
  switch (parts[1]) {
    case undefined: return 'Overview';
    case 'chat': return parts[2] ? ((threads[parts[2]] || {}).conv || {}).title || 'Conversation' : 'New chat';
    case 'history': return 'Chat history';
    case 'sources': return parts[2] ? 'Source details' : 'Knowledge sources';
    case 'profile': return 'Profile';
    case 'settings': return 'Settings';
    default: return 'Not found';
  }
}

/** Sidebar list: GET /conversations, searched on the server. */
function Recents({ current }) {
  const { ui, convVer } = useApp();
  const [state, setState] = useState({ status: 'loading', list: [] });
  const q = ui.sideQ.trim();

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      conversationService.list({ q, pageSize: q ? 20 : 6 }, { signal: ctrl.signal })
        .then(r => setState({ status: 'ready', list: r.data }))
        .catch(e => { if (e.name !== 'AbortError') setState(s => ({ ...s, status: 'error', error: e })); });
    }, q ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, convVer]);

  if (state.status === 'loading' && !state.list.length) return <p className="none">Loading conversations…</p>;
  if (state.status === 'error' && !state.list.length) return <p className="none">Could not load conversations</p>;
  if (!state.list.length) return <p className="none">{q ? 'No matching conversations' : 'No conversations yet'}</p>;
  return state.list.map(c => <Link key={c.id} to={`/app/chat/${c.id}`} title={c.title} aria-current={c.id === current ? 'page' : undefined}>{c.title}</Link>);
}

/** Bell menu: GET /notifications, PATCH /notifications/:id/read, POST /notifications/read-all. */
function Notifications() {
  const { toast } = useApp();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', list: [], unread: 0 });
  const load = useCallback(() => notificationService.list()
    .then(r => setState({ status: 'ready', list: r.data, unread: (r.meta && r.meta.unread) || r.data.filter(n => !n.read_at).length }))
    .catch(e => setState(s => ({ ...s, status: 'error', error: e }))), []);
  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, [load]);

  const markAll = async () => {
    try { await notificationService.readAll(); setState(s => ({ ...s, unread: 0, list: s.list.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })) })); toast('Notifications marked as read.'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const open = async n => {
    if (!n.read_at) {
      setState(s => ({ ...s, unread: Math.max(0, s.unread - 1), list: s.list.map(x => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) }));
      notificationService.read(n.id).catch(() => load());
    }
    if (n.link && n.link.startsWith('/app')) navigate(n.link);
  };

  return (
    <MenuWrap menuClass="notif" trigger={p => <button className="icon-btn" aria-label={`Notifications${state.unread ? `, ${state.unread} unread` : ''}`} {...p} onClick={e => { p.onClick(e); load(); }}><Icon name="bell" />{state.unread > 0 && <span className="dot" id="ndot" />}</button>}>
      <div className="nh"><span>Notifications</span>{state.unread > 0 && <button onClick={markAll}>Mark all as read</button>}</div>
      {state.status === 'loading' && !state.list.length && <div className="ni"><span>Loading…</span></div>}
      {state.status === 'error' && !state.list.length && <div className="ni"><span>Notifications could not be loaded.</span></div>}
      {state.status === 'ready' && !state.list.length && <div className="ni"><span>You have no notifications.</span></div>}
      {state.list.slice(0, 8).map(n => (
        <button className="ni" key={n.id} onClick={() => open(n)} style={{ width: '100%', textAlign: 'left', opacity: n.read_at ? 0.7 : 1 }}>
          <span className="tl"><span className="tico" style={{ display: 'grid' }}><Icon name={notifIcon(n.type)} /></span></span>
          <span><b style={{ fontWeight: n.read_at ? 500 : 650 }}>{n.title}</b>{n.message ? <> {n.message}</> : null}<small>{rel(n.created_at)}</small></span>
        </button>
      ))}
    </MenuWrap>
  );
}

export default function AppLayout() {
  const { user, ui, setUi, logout, threads, resetNewChat } = useApp();
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const parts = path.split('/').filter(Boolean);
  const [col, setCol] = useState(() => store.get('sideCol', false));
  const [navOpen, setNavOpen] = useState(false);
  const flush = parts[1] === 'chat';
  const name = (user && (user.fullName || user.email)) || '';
  const role = user ? ROLE_LABEL[user.role] || user.role : '';

  useEffect(() => { setNavOpen(false); }, [pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = e => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const toggleCol = () => setCol(c => { store.set('sideCol', !c); return !c; });
  const on = p => p === '/app' ? path === '/app' : path.startsWith(p);

  return (
    <div className={`shell ${col ? 'col' : ''} ${navOpen ? 'nav-open' : ''}`} id="shell">
      <aside className="side" aria-label="Workspace navigation">
        <div className="side-top">
          <Link className="brand" to="/app"><BrandMark size={30} /></Link>
          <button className="icon-btn collapse" onClick={toggleCol} aria-label={`${col ? 'Expand' : 'Collapse'} sidebar`}><Icon name="panel-left" /></button>
        </div>
        <nav className="snav" aria-label="Main">
          <Link className="new" to="/app/chat" onClick={resetNewChat} data-tip="New Chat" aria-current={path === '/app/chat' ? 'page' : undefined}><Icon name="plus" /><span className="lbl-t">New Chat</span></Link>
          {NAV.map(([p, i, l]) => <Link key={p} to={p} data-tip={l} aria-current={on(p) ? 'page' : undefined}><Icon name={i} /><span className="lbl-t">{l}</span></Link>)}
        </nav>
        <div className="side-sec">
          <div className="h"><span>Recent conversations</span></div>
          <div className="side-search"><Icon name="search" /><label className="sr" htmlFor="side-q">Search conversations</label>
            <input id="side-q" placeholder="Search" value={ui.sideQ} onChange={e => setUi({ sideQ: e.target.value })} /></div>
          <div className="recents" id="recents"><Recents current={parts[1] === 'chat' ? parts[2] : null} /></div>
        </div>
        <div className="side-user">
          <Link to="/app/profile" data-tip="Profile"><span className="avatar">{initials(name)}</span><span className="txt trunc"><b className="trunc">{name}</b><small>{role}</small></span></Link>
          <button className="icon-btn" onClick={logout} aria-label="Sign out" data-tip="Sign out"><Icon name="log-out" /></button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <div className="main">
        <header className="top">
          <button className="icon-btn burger" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="crumbs"><span className="root">Workspace</span><Icon name="chevron-right" /><b className="trunc">{crumbFor(parts, threads)}</b></div>
          <span className="grow" />
          <Notifications />
          <MenuWrap trigger={p => <button className="row gap8" aria-label="Account menu" style={{ padding: 4, borderRadius: 99 }} {...p}><span className="avatar">{initials(name)}</span></button>}>
            <div style={{ padding: '8px 10px' }}><b style={{ fontSize: 14 }}>{name}</b><br /><small className="muted">{user && user.email}</small></div><hr />
            <Link to="/app/profile"><Icon name="user" />Profile</Link><Link to="/app/settings"><Icon name="settings" />Settings</Link><hr />
            <button className="danger" onClick={logout}><Icon name="log-out" />Sign out</button>
          </MenuWrap>
        </header>
        <main id="main" className={`content ${flush ? 'flush' : ''}`}><Outlet /></main>
      </div>
    </div>
  );
}
