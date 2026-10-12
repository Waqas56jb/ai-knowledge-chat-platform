import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { ROLE_LABEL } from '../data/config';
import { fmtDate, passwordError } from '../utils/format';
import AuthLayout from '../components/auth/AuthLayout';
import Field from '../components/common/Field';
import Icon from '../components/common/Icon';

const ORDER = ['r-name', 'r-code', 'r-pw', 'r-pw2', 'r-terms'];
const INVITE_ERRORS = {
  INVITATION_INVALID: 'This invitation code is not valid. Check the link or ask your administrator for a new invitation.',
  INVITATION_EXPIRED: 'This invitation has expired. Ask your administrator to resend it.',
  INVITATION_REVOKED: 'This invitation was revoked. Ask your administrator for a new one.',
  INVITATION_USED: 'This invitation has already been used. Sign in instead.'
};
/* Accept a pasted full link (…/register?invite=nxs_…) as well as the bare code. */
const extractToken = v => { const s = (v || '').trim(); const m = s.match(/[?&]invite=([^&#\s]+)/); return m ? decodeURIComponent(m[1]) : s; };

/** Registration is invitation acceptance: validate the token, then create the account for the invited email. */
export default function Register() {
  const { acceptInvitation, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlToken = params.get('invite') || '';
  const [f, setF] = useState({ name: '', code: urlToken, pw: '', pw2: '', terms: false });
  const [invite, setInvite] = useState(null); // { email, role, expiresAt, token }
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const checked = useRef('');
  const set = (k, id) => v => { setF(x => ({ ...x, [k]: v })); setErr(e => ({ ...e, [id]: '' })); if (k === 'code') { setInvite(null); checked.current = ''; } };
  const focusFirst = errs => { const id = ORDER.find(k => errs[k]); id && setTimeout(() => { const el = document.getElementById(id); el && el.focus(); }, 0); };

  /** POST /auth/validate-invitation → { email, role, expiresAt } */
  const validate = useCallback(async raw => {
    const token = extractToken(raw);
    if (!token) { setErr(e => ({ ...e, 'r-code': 'Enter your invitation code.' })); return null; }
    if (checked.current === token && invite) return invite;
    setChecking(true); setAlert('');
    try {
      const r = await authService.validateInvitation(token);
      const inv = { ...r, token };
      checked.current = token; setInvite(inv); setErr(e => ({ ...e, 'r-code': '' }));
      return inv;
    } catch (ex) {
      setInvite(null);
      setErr(e => ({ ...e, 'r-code': ex.message || INVITE_ERRORS[ex.code] || 'This invitation could not be checked.' }));
      return null;
    } finally { setChecking(false); }
  }, [invite]);

  useEffect(() => { if (urlToken) validate(urlToken); }, [urlToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async e => {
    e.preventDefault(); setAlert('');
    const errs = {
      'r-name': f.name.trim().length < 2 ? 'Enter your full name.' : '',
      'r-code': !f.code.trim() ? 'Enter your invitation code.' : '',
      'r-pw': passwordError(f.pw),
      'r-pw2': f.pw2 !== f.pw ? 'The passwords do not match.' : '',
      'r-terms': !f.terms ? 'Accept the terms to continue.' : ''
    };
    setErr(errs);
    if (Object.values(errs).some(Boolean)) { focusFirst(errs); return; }
    setBusy(true);
    const inv = await validate(f.code);
    if (!inv) { setBusy(false); focusFirst({ 'r-code': 1 }); return; }
    try {
      await acceptInvitation({ token: inv.token, fullName: f.name.trim(), password: f.pw });
      toast('Account created. Welcome, ' + f.name.trim().split(' ')[0] + '.');
      navigate('/app', { replace: true });
    } catch (ex) {
      setBusy(false);
      if (INVITE_ERRORS[ex.code]) { setInvite(null); checked.current = ''; setErr({ 'r-code': ex.message || INVITE_ERRORS[ex.code] }); focusFirst({ 'r-code': 1 }); }
      else setAlert(ex.message);
    }
  };

  return (
    <AuthLayout kind="register" title={<>Create your <em>account.</em></>} sub="Access is by invitation. Open the link from your invitation, or paste the invitation code below.">
      <div id="form-alert">
        {!f.code.trim() && !invite && <div className="alert info"><Icon name="key" /><span>There is no open sign-up. A workspace administrator must invite you first; the invitation contains a link with your code.</span></div>}
        {invite && <div className="alert info" role="status"><Icon name="check-circle" /><span>Invitation for <b>{invite.email}</b> as {ROLE_LABEL[invite.role] || invite.role}{invite.expiresAt ? `, valid until ${fmtDate(invite.expiresAt)}` : ''}.</span></div>}
        {alert && <div className="alert err" role="alert"><Icon name="alert-circle" /><span>{alert}</span></div>}
      </div>
      <form onSubmit={submit} noValidate>
        <Field id="r-code" label="Invitation code" icon="key" ph="nxs_…" value={f.code} onChange={set('code', 'r-code')} error={err['r-code']}
          help={invite ? null : <button type="button" className="link" onClick={() => validate(f.code)} disabled={checking || !f.code.trim()}>{checking ? 'Checking invitation…' : 'Check invitation'}</button>} />
        <Field id="r-email" label="Email" type="email" icon="mail" ph="Filled in from your invitation" ac="email" value={invite ? invite.email : ''} disabled
          help={invite ? 'The account is created for the invited email address.' : null} />
        <Field id="r-name" label="Full name" icon="user" ph="Your full name" ac="name" value={f.name} onChange={set('name', 'r-name')} error={err['r-name']} />
        <Field id="r-pw" label="Password" type="password" icon="lock" ph="At least 8 characters" ac="new-password" value={f.pw} onChange={set('pw', 'r-pw')} error={err['r-pw']} />
        <Field id="r-pw2" label="Confirm password" type="password" icon="lock" ph="Repeat your password" ac="new-password" value={f.pw2} onChange={set('pw2', 'r-pw2')} error={err['r-pw2']} />
        <div className="field">
          <label className="check"><input type="checkbox" id="r-terms" checked={f.terms} onChange={e => set('terms', 'r-terms')(e.target.checked)} aria-invalid={err['r-terms'] ? 'true' : 'false'} />
            <span>I accept the <Link className="link" to="/terms">Terms of Service</Link> and <Link className="link" to="/privacy">Privacy Policy</Link>.</span></label>
          <p className="err-msg" id="r-terms-err" role="alert">{err['r-terms']}</p>
        </div>
        <button className={`btn btn-pri btn-lg block ${busy ? 'loading' : ''}`} disabled={busy}>Create account</button>
      </form>
      <p className="auth-foot">Already registered? <Link className="link" to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}
