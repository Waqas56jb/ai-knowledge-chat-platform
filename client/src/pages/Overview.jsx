import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TYPES, groupOf } from '../data/config';
import { userService } from '../services/userService';
import { conversationService } from '../services/conversationService';
import { firstName, rel, weekday } from '../utils/format';
import Icon from '../components/common/Icon';
import { EmptyState, ErrorState, StatusBadge } from '../components/common/ui';
import Composer from '../components/chat/Composer';

export default function Overview() {
  const { user, send, convVer, suggest, loadSuggestions, canChat, resetNewChat } = useApp();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  /* GET /users/me/overview */
  const load = useCallback(() => {
    setState(s => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }));
    userService.overview().then(data => setState({ status: 'ready', data, error: null })).catch(error => setState(s => ({ ...s, status: 'error', error })));
  }, []);
  useEffect(() => { load(); }, [load, convVer]);
  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const d = state.data;
  const days = d ? (d.questionsLast7Days || []).map(x => ({ l: weekday(x.date), n: x.count, date: x.date })) : [];
  const max = Math.max(1, ...days.map(x => x.n));
  const week = days.reduce((n, x) => n + x.n, 0);
  const stats = d && [
    ['library', 'Knowledge sources', d.counts.sources, 'available to you'],
    ['messages-square', 'Conversations', d.counts.conversations, 'saved to your account'],
    ['help-circle', 'Questions asked', d.counts.questions, 'across all chats'],
    ['activity', 'This week', week, 'questions in the last 7 days']
  ];
  /* activity = real recent conversations and sources, newest first */
  const activity = d ? [
    ...d.recentConversations.map(c => ({ key: 'c' + c.id, icon: 'message-square', text: <>Conversation <Link className="link" to={`/app/chat/${c.id}`}>{c.title}</Link> updated</>, at: c.updatedAt })),
    ...d.recentSources.map(s => ({ key: 's' + s.id, icon: TYPES[groupOf(s)].icon, text: <>Source <Link className="link" to={`/app/sources/${s.id}`}>{s.title}</Link> added</>, at: s.createdAt }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5) : [];
  const name = firstName(user);

  return (
    <div className="page">
      <div className="ph"><div><h1>{greet}{name ? <>, <em>{name}.</em></> : '.'}</h1><p>Explore your knowledge and pick up where you left off.</p></div><Link className="btn btn-out" to="/app/chat" onClick={resetNewChat}><Icon name="plus" />New chat</Link></div>
      <section className="home-comp" aria-label="Ask a question">
        <Composer placeholder="What would you like to know?" />
        {canChat && suggest.status === 'ready' && suggest.items.length > 0 && <div className="sugs">{suggest.items.map(s => <button key={s.id} className="sug" onClick={() => send(s.prompt, null)}>{s.prompt}</button>)}</div>}
      </section>
      {state.status === 'error' && !d ? <div className="card"><ErrorState error={state.error} title="Could not load your overview" onRetry={load} /></div> : <>
        <section className="stats" aria-label="Workspace snapshot">
          {stats ? stats.map(s => <div className="card stat" key={s[1]}><div className="k"><Icon name={s[0]} />{s[1]}</div><div className="v">{s[2]}</div><small>{s[3]}</small></div>)
            : [0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 112 }} />)}
        </section>
        <div className="cols">
          <div className="stack">
            <section className="card blk"><div className="blk-h"><h2>Recent conversations</h2><Link className="link" to="/app/history" style={{ fontSize: 14 }}>View all</Link></div>
              {!d ? [0, 1, 2].map(i => <div key={i} className="skel" style={{ height: 52, margin: '8px 0' }} />)
                : d.recentConversations.length ? d.recentConversations.slice(0, 4).map(c => (
                  <div className="li" key={c.id}><span className="sicon t-document"><Icon name="message-square" /></span>
                    <div className="b"><h3 className="trunc"><Link className="stretch" to={`/app/chat/${c.id}`}>{c.title}</Link></h3><p className="trunc">{conversationService.preview(c)}</p></div>
                    <div className="meta">{rel(c.updatedAt)}<br />{c.sourceCount || 0} source{c.sourceCount === 1 ? '' : 's'}</div></div>
                )) : <EmptyState icon="message-square" title="No conversations yet" text={canChat ? 'Ask your first question above to start a conversation.' : 'Conversations you can view will be listed here.'} />}
            </section>
            <section className="card blk"><div className="blk-h"><h2>Questions asked, last 7 days</h2>{d && <span className="badge">{week} total</span>}</div>
              {!d ? <div className="skel" style={{ height: 150 }} /> : (
                <div className="bars" role="img" aria-label={'Questions per day: ' + days.map(x => x.l + ' ' + x.n).join(', ')}>
                  {days.map(x => <div key={x.date}><b>{x.n || ''}</b><i style={{ height: Math.round(x.n / max * 78) + '%' }} /><span>{x.l}</span></div>)}
                </div>)}
            </section>
          </div>
          <div className="stack">
            <section className="card blk"><div className="blk-h"><h2>Recent knowledge sources</h2><Link className="link" to="/app/sources" style={{ fontSize: 14 }}>Browse</Link></div>
              {!d ? [0, 1, 2].map(i => <div key={i} className="skel" style={{ height: 52, margin: '8px 0' }} />)
                : d.recentSources.length ? d.recentSources.slice(0, 4).map(s => { const g = groupOf(s); return (
                  <div className="li" key={s.id}><span className={`sicon t-${g}`}><Icon name={TYPES[g].icon} /></span>
                    <div className="b"><h3 className="trunc"><Link className="stretch" to={`/app/sources/${s.id}`}>{s.title}</Link></h3><p>{TYPES[g].label}, added {rel(s.createdAt).toLowerCase()}</p></div>
                    <StatusBadge s={s} /></div>
                ); }) : <EmptyState icon="library" title="No knowledge sources yet" text="When an administrator adds and indexes sources, they appear here and suggested questions are built from them." />}
            </section>
            <section className="card blk"><div className="blk-h"><h2>Activity</h2></div>
              {!d ? <div className="skel" style={{ height: 120 }} />
                : activity.length ? <ul className="tl">{activity.map(a => <li key={a.key}><span className="tico"><Icon name={a.icon} /></span><span>{a.text}<small>{rel(a.at)}</small></span></li>)}</ul>
                  : <p className="muted">No activity yet.</p>}
            </section>
          </div>
        </div>
      </>}
    </div>
  );
}
