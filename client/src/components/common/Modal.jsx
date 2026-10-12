import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Global dialog. Config: { title, text | body, ok, cancel, danger, hideCancel, prompt: { label, value }, onOk }.
 * onOk may return false to keep the dialog open. Focus is trapped and restored on close.
 */
export default function Modal() {
  const { modal, closeModal } = useApp();
  return modal ? <Dialog key={modal.title + (modal.prompt ? modal.prompt.value : '')} cfg={modal} close={closeModal} /> : null;
}

function Dialog({ cfg, close }) {
  const { title, text, body, ok = 'Confirm', cancel = 'Cancel', danger = false, hideCancel = false, prompt, onOk } = cfg;
  const [val, setVal] = useState(prompt ? prompt.value : '');
  const [err, setErr] = useState('');
  const formRef = useRef(null);
  const lastFocus = useRef(document.activeElement);

  useEffect(() => {
    const f = formRef.current.querySelector('input, button'); f && f.focus(); if (f && f.select) f.select();
    const prev = lastFocus.current;
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        const fs = [...formRef.current.querySelectorAll('button, input, a[href], select')].filter(x => !x.disabled);
        if (!fs.length) return;
        const first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); prev && prev.focus && prev.focus(); };
  }, [close]);

  const submit = e => {
    e.preventDefault();
    if (prompt) { const v = val.trim(); if (!v) { setErr(prompt.emptyError || 'Enter a title.'); return; } if (onOk && onOk(v) === false) return; }
    else if (onOk && onOk() === false) return;
    close();
  };

  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="m-title" ref={formRef} onSubmit={submit}>
        <h2 id="m-title">{title}</h2>
        {text && <p>{text}</p>}
        {body}
        {prompt && (
          <div className="field" style={{ margin: '12px 0 0' }}>
            <label htmlFor="m-in">{prompt.label}</label>
            <input className="input" id="m-in" value={val} maxLength={prompt.maxLength || 80} aria-invalid={err ? 'true' : 'false'} onChange={e => { setVal(e.target.value); setErr(''); }} />
            <p className="err-msg" id="m-in-err" role="alert">{err}</p>
          </div>
        )}
        <div className="modal-f">
          {!hideCancel && <button type="button" className="btn btn-out" onClick={close}>{cancel}</button>}
          <button className={`btn ${danger ? 'btn-danger' : 'btn-pri'}`}>{ok}</button>
        </div>
      </form>
    </div>
  );
}
