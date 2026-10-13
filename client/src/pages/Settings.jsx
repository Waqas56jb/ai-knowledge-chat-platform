import { useApp } from '../context/AppContext';
import { LANGS, TZ } from '../data/config';
import Icon from '../components/common/Icon';
import { Options } from '../components/common/ui';
import { withCurrent } from './Profile';

const TABS = [['general', 'sliders', 'General'], ['chat', 'message-square', 'Chat preferences'], ['privacy', 'shield', 'Privacy and data']];

/* Setting rows live outside the page so React keeps them mounted (and focused) across changes. */
const Sw = ({ s, save, k, title, text }) => (
  <div className="srow"><div><h3 id={`s-${k}`}>{title}</h3><p>{text}</p></div>
    <label className="switch"><input type="checkbox" checked={!!s[k]} onChange={e => save(k, e.target.checked)} aria-labelledby={`s-${k}`} /><span /></label></div>
);
const Sel = ({ s, save, k, title, text, list }) => (
  <div className="srow"><div><h3 id={`s-${k}`}>{title}</h3><p>{text}</p></div>
    <select className="select sm" value={s[k]} onChange={e => save(k, e.target.value)} aria-labelledby={`s-${k}`}><Options list={list} /></select></div>
);
const Seg = ({ s, save, k, title, text, list }) => (
  <div className="srow"><div><h3>{title}</h3><p>{text}</p></div>
    <div className="tabs" role="group" aria-label={title}>{list.map(([v, l, i]) => <button key={v} onClick={() => save(k, v)} aria-pressed={s[k] === v}>{i && <Icon name={i} />}{l}</button>)}</div></div>
);

/** Preferences → PATCH /users/me { preferences }; language/time zone → profile fields; DELETE /users/me/conversations. */
export default function Settings() {
  const { settings, setSetting, user, ui, setUi, toast, confirmDialog, clearAllConvs } = useApp();
  const t = ui.setTab && TABS.some(x => x[0] === ui.setTab) ? ui.setTab : 'general';
  const s = { ...settings, language: (user && user.language) || 'English', timezone: (user && user.timezone) || 'UTC' };
  const save = (k, v) => { setSetting(k, v).then(() => toast('Preference saved.')).catch(e => toast(e.message || 'The preference could not be saved.', 'err')); };

  const clearConvs = () => confirmDialog('Delete all your conversations?', 'Every conversation and message in your account will be permanently deleted. This cannot be undone.', 'Delete conversations', () => {
    clearAllConvs().then(r => toast(`${r && r.deleted != null ? r.deleted : 'All'} conversation${r && r.deleted === 1 ? '' : 's'} deleted.`)).catch(e => toast(e.message, 'err'));
  });

  const body = {
    general: <>
      <Sel s={s} save={save} k="language" title="Preferred language" text="Saved to your profile. The interface is currently available in English." list={withCurrent(LANGS, s.language)} />
      <Sel s={s} save={save} k="timezone" title="Time zone" text="Saved to your profile and used when dates and times are displayed." list={withCurrent(TZ, s.timezone)} />
      <Seg s={s} save={save} k="theme" title="Appearance" text="Choose a light or dark interface, or follow your device." list={[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'monitor']]} />
      <Seg s={s} save={save} k="density" title="Density" text="Comfortable gives more room. Compact shows more on screen." list={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} />
    </>,
    chat: <>
      <Sw s={s} save={save} k="enterToSend" title="Press Enter to send" text="When off, use Ctrl+Enter to send and Enter for a new line." />
      <Sw s={s} save={save} k="showCitations" title="Show source citations" text="Display citation markers and source cards under answers." />
      <Sw s={s} save={save} k="showFollowups" title="Display follow-up suggestions" text="Suggest related questions after each answer." />
    </>,
    privacy: <>
      <div className="srow"><div><h3>Where your data is stored</h3><p>Your conversations, profile and preferences are stored in your workspace account, so they follow you across devices.</p></div><span className="badge"><Icon name="shield" />Your account</span></div>
      <div className="srow"><div><h3>Delete all conversations</h3><p>Permanently removes every conversation and message in your account. This cannot be undone.</p></div><button className="btn btn-sm btn-out" onClick={clearConvs} style={{ color: 'var(--err)' }}><Icon name="trash-2" />Delete conversations</button></div>
      <div className="srow"><div><h3>Account removal</h3><p>Accounts are managed by your workspace administrators. Contact one of them to close your account.</p></div></div>
    </>
  }[t];

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="ph"><div><h1>Settings</h1><p>Preferences are saved to your account.</p></div></div>
      <div className="set">
        <nav className="card set-nav" role="tablist" aria-label="Settings sections">
          {TABS.map(([v, i, l]) => <button key={v} role="tab" aria-selected={t === v} onClick={() => setUi({ setTab: v })}><Icon name={i} />{l}</button>)}
        </nav>
        <section className="card set-b" role="tabpanel">{body}</section>
      </div>
    </div>
  );
}
