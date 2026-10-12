import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { firstName, isEmail } from '../utils/format';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/common/Field';
import Icon from '../components/common/Icon';

/* Used only if the server sends no message for these codes. */
const LOGIN_ERRORS = {
  INVALID_CREDENTIALS: 'That email and password do not match an account.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Contact your workspace administrator.'
};

export default function Login() {
  const { login, toast } = useApp();
  const navigate = useNavigate();
  const { state } = useLocation(); // { from, notice } when redirected from a workspace page
  const notice = state && state.notice;
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault(); setAlert('');
    const errs = { email: !email.trim() ? 'Enter your email.' : !isEmail(email.trim()) ? 'Enter a valid email address.' : '', pw: !pw ? 'Enter your password.' : '' };
    setErr(errs); if (errs.email || errs.pw) return;
    setBusy(true);
    try {
      const s = await login(email.trim(), pw, remember);
      const n = firstName(s.user);
      toast('Signed in. Welcome back' + (n ? ', ' + n : '') + '.');
      navigate((state && state.from) || '/app', { replace: true });
    } catch (ex) {
      setAlert(ex.message || LOGIN_ERRORS[ex.code] || 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <AuthLayout kind="login" title={<>Welcome <em>back.</em></>} sub="Sign in to DTS AI.">
      {notice && <div className="alert info"><Icon name="lock" /><span>{notice}</span></div>}
      <div id="form-alert">{alert && <div className="alert err" role="alert"><Icon name="alert-circle" /><span>{alert}</span></div>}</div>
      <form onSubmit={submit} noValidate>
        <Field id="l-email" label="Email" type="email" icon="mail" ph="you@company.com" ac="email" value={email} onChange={v => { setEmail(v); setErr(x => ({ ...x, email: '' })); }} error={err.email} />
        <Field id="l-pw" label="Password" type="password" icon="lock" ph="Your password" ac="current-password" value={pw} onChange={v => { setPw(v); setErr(x => ({ ...x, pw: '' })); }} error={err.pw} />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
          <label className="check"><input type="checkbox" id="l-rem" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me</label>
          <Link className="link" to="/forgot-password" style={{ fontSize: 14 }}>Forgot password?</Link>
        </div>
        <button className={`btn btn-pri btn-lg block ${busy ? 'loading' : ''}`} disabled={busy}>Sign in</button>
      </form>
      <p className="auth-foot">Have an invitation? <Link className="link" to="/register">Create your account</Link></p>
    </AuthLayout>
  );
}
