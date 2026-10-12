import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { passwordError } from '../utils/format';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/common/Field';
import Icon from '../components/common/Icon';

/** Target of the Supabase recovery link: /reset-password#access_token=…&type=recovery */
export default function ResetPassword() {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const { toast } = useApp();
  const link = useMemo(() => {
    const h = new URLSearchParams(hash.replace(/^#/, '')), q = new URLSearchParams(search);
    return { token: h.get('access_token') || q.get('access_token') || '', error: h.get('error_description') || q.get('error_description') || '' };
  }, [hash, search]);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault(); setAlert('');
    const errs = { pw: passwordError(pw), pw2: pw2 !== pw ? 'The passwords do not match.' : '' };
    setErr(errs); if (errs.pw || errs.pw2) return;
    setBusy(true);
    try {
      const r = await authService.resetPassword(link.token, pw);
      toast((r && r.message) || 'Password updated.');
      navigate('/login', { replace: true, state: { notice: 'Your password was changed. Sign in with the new password.' } });
    } catch (ex) { setAlert(ex.message); setBusy(false); }
  };

  if (!link.token) return (
    <AuthLayout kind="reset" title={<>Reset link <em>needed.</em></>} sub="Open this page from the password reset email.">
      <div className="alert err" role="alert"><Icon name="alert-circle" /><span>{link.error || 'This reset link is missing its token or has expired. Request a new one.'}</span></div>
      <Link className="btn btn-pri btn-lg block" to="/forgot-password">Request a new link</Link>
      <p className="auth-foot"><Link className="link" to="/login">Back to sign in</Link></p>
    </AuthLayout>
  );

  return (
    <AuthLayout kind="reset" title={<>Choose a new <em>password.</em></>} sub="Use 8 to 72 characters with at least one letter and one number.">
      <div id="form-alert">{alert && <div className="alert err" role="alert"><Icon name="alert-circle" /><span>{alert}</span></div>}</div>
      <form onSubmit={submit} noValidate>
        <Field id="rp-pw" label="New password" type="password" icon="lock" ph="At least 8 characters" ac="new-password" value={pw} onChange={v => { setPw(v); setErr(x => ({ ...x, pw: '' })); }} error={err.pw} />
        <Field id="rp-pw2" label="Confirm password" type="password" icon="lock" ph="Repeat your password" ac="new-password" value={pw2} onChange={v => { setPw2(v); setErr(x => ({ ...x, pw2: '' })); }} error={err.pw2} />
        <button className={`btn btn-pri btn-lg block ${busy ? 'loading' : ''}`} disabled={busy}>Update password</button>
      </form>
      <p className="auth-foot"><Link className="link" to="/login">Back to sign in</Link></p>
    </AuthLayout>
  );
}
