import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { BRAND, TYPES, groupOf } from '../../data/config';
import { rel } from '../../utils/format';
import Icon from '../common/Icon';
import Logo from '../common/Logo';
import MenuWrap from '../common/MenuWrap';

const citeFor = (m, n) => (m.citations || []).find(c => c.n === n) || null;
const locOf = c => (c.timestamp ? c.timestamp : c.pageNumber ? 'Page ' + c.pageNumber : '');

/** Tiny markdown: paragraphs, "- " lists, **bold** and [n] citation markers mapped to m.citations by n. */
function Inline({ text, m, showC, onCite }) {
  const parts = text.split(/(\*\*.+?\*\*|\s?\[\d+\])/g);
  return parts.map((p, i) => {
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const c = p.match(/^\s?\[(\d+)\]$/);
    if (c) { const n = +c[1]; return showC && citeFor(m, n) ? <button key={i} className="cite" onClick={() => onCite(n)} aria-label={`Open source ${n}`}>{n}</button> : null; }
    return p;
  });
}
function Prose({ m, showC, onCite }) {
  return (m.content || '').split(/\n\n+/).map((b, bi) => {
    const ls = b.split('\n');
    if (ls.every(l => /^[-*] /.test(l))) return <ul key={bi}>{ls.map((l, i) => <li key={i}><Inline text={l.slice(2)} m={m} showC={showC} onCite={onCite} /></li>)}</ul>;
    return <p key={bi}>{ls.map((l, i) => <span key={i}>{i > 0 && <br />}<Inline text={l.replace(/^[-*] /, '• ')} m={m} showC={showC} onCite={onCite} /></span>)}</p>;
  });
}

const OUTCOME = {
  insufficient_evidence: ['Not enough evidence', 'Your sources do not cover this well enough for a supported answer.'],
  out_of_scope: ['Outside the workspace scope', 'This question is outside what this workspace is set up to answer.'],
  error: ['No answer', 'The answer could not be generated.']
};

export default function Message({ m, convId, isLast, busy, onCite, onEdit }) {
  const { settings, toast, regenerate, retry, setFeedback, promptDialog, canChat } = useApp();

  if (m.role === 'user') return (
    <div className="m m-user">
      <div className="bubble">{m.content.split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</div>
      {canChat && <div className="m-act"><button className="icon-btn sm" onClick={() => onEdit(m)} aria-label="Edit and ask again" data-tip="Edit and ask again"><Icon name="pencil" /></button></div>}
    </div>
  );

  const cites = m.citations || [];
  const showC = settings.showCitations;
  const outcome = m.outcome || 'answered';
  const saved = !m.local; // local = a failed send that never reached the server

  const copy = withSources => {
    let txt = (m.content || '').replace(/\s?\[\d+\]/g, '');
    if (withSources && cites.length) txt = m.content + '\n\nSources:\n' + cites.map(c => `[${c.n}] ${c.sourceTitle}${locOf(c) ? ' (' + locOf(c) + ')' : ''}${c.url ? ' ' + c.url : ''}`).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Response copied.')).catch(() => toast('Copy is not available in this browser.', 'err'));
  };
  const feedback = async v => {
    const nv = m.feedback === v ? null : v;
    try { await setFeedback(convId, m, nv); toast(nv ? 'Thanks for the feedback.' : 'Feedback removed.'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const report = () => promptDialog('Report a problem', 'What was wrong with this answer?', '', v => {
    setFeedback(convId, m, 'down', v).then(() => toast('Report sent to the workspace administrators.')).catch(e => toast(e.message, 'err'));
  });

  let body;
  if (outcome === 'answered') body = <div className={`prose${m.streaming ? ' streaming' : ''}`}><Prose m={m} showC={showC} onCite={onCite} /></div>;
  else {
    const [title, hint] = OUTCOME[outcome] || OUTCOME.error;
    const f = m.failed;
    body = (
      <div className="fallback"><Icon name={outcome === 'error' ? 'alert-triangle' : 'alert-circle'} /><div>
        <p><b>{title}.</b> {m.content || hint}</p>
        {f && f.retryable && <p style={{ marginTop: 10 }}><button className="btn btn-sm btn-out" onClick={() => retry(m)} disabled={busy}><Icon name="refresh-cw" />Try again</button></p>}
        {outcome !== 'error' && <p style={{ marginTop: 8 }}><Link className="link" to="/app/sources">Explore available sources</Link></p>}
      </div></div>
    );
  }

  return (
    <article className="m m-ai"><span className="mark"><Logo size={30} /></span><div>
      <div className="m-meta"><b>{BRAND.name}</b>{outcome !== 'answered' && <span className="badge warn">{(OUTCOME[outcome] || OUTCOME.error)[0]}</span>}<time dateTime={m.createdAt}>{rel(m.createdAt)}</time></div>
      {body}
      {showC && cites.length > 0 && (
        <div className="cites"><div className="cites-h"><Icon name="quote" />{cites.length} source{cites.length > 1 ? 's' : ''}</div>
          <div className="cites-g">{cites.map(c => {
            const g = groupOf({ type: c.sourceType }), loc = locOf(c);
            return <button key={c.n} className="ccard" onClick={() => onCite(c.n)}><span className="c num">{c.n}</span><div><b>{c.sourceTitle}</b><small><Icon name={TYPES[g].icon} />{TYPES[g].label}{loc ? ', ' + loc : ''}</small></div></button>;
          })}</div></div>
      )}
      {saved && <div className="m-act">
        <button className="icon-btn sm" onClick={() => copy(false)} aria-label="Copy response" data-tip="Copy"><Icon name="copy" /></button>
        {cites.length > 0 && <button className="icon-btn sm" onClick={() => onCite(cites[0].n)} aria-label="View sources" data-tip="View sources"><Icon name="book-open" /></button>}
        <button className="icon-btn sm" onClick={() => feedback('up')} aria-pressed={m.feedback === 'up'} aria-label="Helpful" data-tip="Helpful"><Icon name="thumbs-up" /></button>
        <button className="icon-btn sm" onClick={() => feedback('down')} aria-pressed={m.feedback === 'down'} aria-label="Not helpful" data-tip="Not helpful"><Icon name="thumbs-down" /></button>
        {isLast && canChat && <button className="icon-btn sm" onClick={() => regenerate(convId)} disabled={busy} aria-label="Ask again" data-tip="Regenerate"><Icon name="refresh-cw" /></button>}
        <MenuWrap menuClass="up left" trigger={p => <button className="icon-btn sm" aria-label="More actions" {...p}><Icon name="more-horizontal" /></button>}>
          <button onClick={() => copy(true)}><Icon name="copy" />Copy with source list</button>
          {cites.length > 0 && <Link to={`/app/sources/${cites[0].sourceId}`}><Icon name="external-link" />Open first source page</Link>}
          <button onClick={report}><Icon name="alert-triangle" />Report a problem</button>
        </MenuWrap>
      </div>}
    </div></article>
  );
}
