import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { isEmail } from '../utils/format';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/common/Field';
import Icon from '../components/common/Icon';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault(); setSent(''); setAlert('');
    const v = email.trim();
    if (!isEmail(v)) { setErr('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      const r = await authService.forgotPassword(v);
      setSent((r && r.message) || `If an account exists for ${v}, a reset link is on its way.`);
    } catch (ex) { setAlert(ex.message); }
    setBusy(false);
  };

  return (
    <AuthLayout kind="forgot" title={<>Reset your <em>password.</em></>} sub="Enter the email address for your account.">
      <div id="form-alert">
        {sent && <div className="alert info" role="status"><Icon name="info" /><span>{sent}</span></div>}
        {alert && <div className="alert err" role="alert"><Icon name="alert-circle" /><span>{alert}</span></div>}
      </div>
      <form onSubmit={submit} noValidate>
        <Field id="f-email" label="Email" type="email" icon="mail" ph="you@company.com" ac="email" value={email} onChange={v => { setEmail(v); setErr(''); }} error={err} />
        <button className={`btn btn-pri btn-lg block ${busy ? 'loading' : ''}`} disabled={busy}>Send reset link</button>
      </form>
      <p className="auth-foot"><Link className="link" to="/login">Back to sign in</Link></p>
    </AuthLayout>
  );
}
