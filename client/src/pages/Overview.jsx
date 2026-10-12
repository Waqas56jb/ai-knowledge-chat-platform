import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TYPES } from '../data/config';
import { firstName } from '../utils/format';
import Icon from '../components/common/Icon';
import Logo from '../components/common/Logo';
import Composer from '../components/chat/Composer';

/** Overview: a welcoming question box plus prompts built from real indexed sources. Sending starts a new chat. */
export default function Overview() {
  const { user, send, suggest, loadSuggestions, canChat } = useApp();
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = firstName(user);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const items = suggest.status === 'ready' ? suggest.items : [];
  return (
    <div className="page home">
      <div className="home-hero">
        <Logo size={48} />
        <h1>{greet}{name ? <>, <em>{name}.</em></> : '.'}</h1>
        <p>What would you like to know today? Ask in plain language and get answers backed by your knowledge library.</p>
      </div>
      <section className="home-comp" aria-label="Ask a question">
        <Composer placeholder="What would you like to know?" />
      </section>
      {suggest.status === 'loading' && <div className="home-prompts" aria-busy="true"><div className="pgrid">{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 64 }} />)}</div></div>}
      {items.length > 0 && (
        <section className="home-prompts" aria-labelledby="home-prompts-h">
          <h2 id="home-prompts-h">Not sure where to start? Try these prompts</h2>
          <div className="pgrid">{items.map(s => (
            <button key={s.id} onClick={() => send(s.prompt, null)} disabled={!canChat}><Icon name={(TYPES[s.group] || TYPES.text).icon} /><span>{s.prompt}</span></button>
          ))}</div>
        </section>
      )}
    </div>
  );
}
