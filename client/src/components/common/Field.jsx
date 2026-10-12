import { forwardRef, useState } from 'react';
import Icon from './Icon';

/** Labelled input with optional leading icon, inline error and a show/hide toggle for passwords. */
const Field = forwardRef(function Field({ id, label, type = 'text', icon, ph = '', ac = 'off', value, onChange, error, help, disabled }, ref) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="in-wrap">
        {icon && <Icon name={icon} className="in-ic" />}
        <input ref={ref} className={`input ${icon ? 'has-ic' : ''}`} id={id} name={id} type={isPw && show ? 'text' : type} value={value} onChange={e => onChange && onChange(e.target.value)}
          placeholder={ph} autoComplete={ac} aria-describedby={`${id}-err`} aria-invalid={error ? 'true' : 'false'} disabled={disabled} />
        {isPw && <button type="button" className="in-btn" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eye-off' : 'eye'} /></button>}
      </div>
      {error ? <p className="err-msg" id={`${id}-err`} role="alert">{error}</p> : <p className="err-msg" id={`${id}-err`} role="alert" />}
      {help && <p className="help">{help}</p>}
    </div>
  );
});
export default Field;
