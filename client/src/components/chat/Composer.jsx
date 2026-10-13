import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';

/** Question box shared by the overview and the chat page. The draft survives navigation. */
export default function Composer({ placeholder, currentId = null, autoFocus = false }) {
  const { ui, setUi, settings, send, canChat, user, publicSettings, composerRef } = useApp();
  // every question searches all sources (no scope picker)
  const ta = useRef(null);
  const value = ui.draft;
  const max = (publicSettings && publicSettings.chat && publicSettings.chat.maxQuestionLength) || 2000;
  const locked = !!user && !canChat;

  useEffect(() => { composerRef.current = ta.current; return () => { if (composerRef.current === ta.current) composerRef.current = null; }; }, [composerRef]);
  useEffect(() => { if (autoFocus && !locked && window.innerWidth > 900) ta.current && ta.current.focus(); }, [autoFocus, currentId, locked]);
  useEffect(() => { const t = ta.current; if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; }, [value]);

  const submit = e => { e && e.preventDefault(); if (!locked) send(value, currentId); };
  const onKey = e => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const ets = settings.enterToSend;
    if ((ets && !e.shiftKey) || (!ets && (e.ctrlKey || e.metaKey))) { e.preventDefault(); submit(); }
  };

  return (
    <>
      {locked && <div className="alert warn" role="status"><Icon name="lock" /><span>Your account is read-only. You can read past conversations, but you cannot ask new questions. Ask an administrator if you need access.</span></div>}
      <form className="comp" onSubmit={submit} aria-disabled={locked}>
        <label className="sr" htmlFor="comp-t">Your question</label>
        <textarea id="comp-t" ref={ta} rows={1} maxLength={max} placeholder={locked ? 'Read-only access: asking questions is disabled' : placeholder} value={value} disabled={locked}
          onChange={e => setUi({ draft: e.target.value })} onKeyDown={onKey} />
        <div className="comp-row">
          <span className="grow" /><span className="count" id="comp-count">{value.length} / {max}</span>
          <button type="button" className="icon-btn" id="comp-clear" onClick={() => { setUi({ draft: '' }); ta.current && ta.current.focus(); }} aria-label="Clear input" hidden={!value}><Icon name="x" /></button>
          <button className="send" id="comp-send" disabled={locked || !value.trim()} aria-label="Send message"><Icon name="arrow-up" /></button>
        </div>
      </form>
      <p className="hint">{settings.enterToSend ? 'Enter to send, Shift+Enter for a new line.' : 'Ctrl+Enter to send.'} Answers come only from your indexed knowledge sources.</p>
    </>
  );
}
