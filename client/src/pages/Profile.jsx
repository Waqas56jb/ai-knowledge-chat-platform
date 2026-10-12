import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LANGS, ROLE_LABEL, TZ } from '../data/config';
import { fmtDate, initials } from '../utils/format';
import Icon from '../components/common/Icon';
import Field from '../components/common/Field';
import { Options } from '../components/common/ui';

/* Keep the user's saved value selectable even if it is not in the static list. */
export const withCurrent = (list, v) => (v && !list.includes(v) ? [v, ...list] : list);

/** PATCH /users/me { fullName, department, timezone, language } */
export default function Profile() {
  const { user, saveProfile, toast } = useApp();
  const fresh = () => ({ fullName: (user && user.fullName) || '', department: (user && user.department) || '', timezone: (user && user.timezone) || 'UTC', language: (user && user.language) || 'English' });
  const [form, setForm] = useState(fresh);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: '' })); setDirty(true); };

  // refresh the form when the profile loads (GET /auth/me) unless the user is editing
  useEffect(() => { if (!dirty) setForm(fresh()); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <div className="page" style={{ maxWidth: 820 }}><div className="skel" style={{ height: 140, marginBottom: 20 }} /><div className="skel" style={{ height: 320 }} /></div>;

  const submit = async e => {
    e.preventDefault();
    const fullName = form.fullName.trim(), department = form.department.trim();
    const errs = { fullName: fullName.length < 2 ? 'Enter your full name.' : '' };
    setErr(errs); if (errs.fullName) return;
    setBusy(true);
    try {
      const p = await saveProfile({ fullName, department, timezone: form.timezone, language: form.language });
      setForm({ fullName: p.fullName || '', department: p.department || '', timezone: p.timezone || form.timezone, language: p.language || form.language });
      setDirty(false); toast('Changes saved.');
    } catch (ex) {
      if (ex.code === 'VALIDATION_ERROR' && ex.details) setErr(Object.fromEntries(Object.entries(ex.details).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])));
      toast(ex.message, 'err');
    }
    setBusy(false);
  };
  const cancel = () => { setForm(fresh()); setErr({}); setDirty(false); toast('Changes discarded.', 'info'); };
  const name = user.fullName || user.email;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="ph"><div><h1>Profile</h1><p>Your account details in this workspace.</p></div></div>
      <div className="card pcard"><span className="avatar lg">{initials(name)}</span><div style={{ minWidth: 0 }}><h2 style={{ fontSize: 21 }}>{name}</h2><p className="muted" style={{ overflowWrap: 'anywhere' }}>{user.email}</p>
        <div className="row gap8 wrap" style={{ marginTop: 10 }}><span className="badge pri"><Icon name="user" />{ROLE_LABEL[user.role] || user.role}</span>{user.department && <span className="badge">{user.department}</span>}<span className="badge"><Icon name="calendar" />Member since {fmtDate(user.createdAt)}</span></div></div></div>
      <form className="card blk" onSubmit={submit} noValidate>
        <div className="blk-h"><h2>Edit profile</h2></div>
        <div className="fgrid">
          <Field id="p-name" label="Full name" ac="name" value={form.fullName} onChange={set('fullName')} error={err.fullName} />
          <Field id="p-email" label="Email" type="email" ac="email" value={user.email} disabled help="Your sign-in email is managed by a workspace administrator." />
          <Field id="p-dept" label="Department" ac="organization-title" ph="Optional" value={form.department} onChange={set('department')} error={err.department} />
          <div className="field"><label htmlFor="p-tz">Time zone</label><select className="select" id="p-tz" value={form.timezone} onChange={e => set('timezone')(e.target.value)}><Options list={withCurrent(TZ, form.timezone)} /></select></div>
          <div className="field"><label htmlFor="p-lang">Language</label><select className="select" id="p-lang" value={form.language} onChange={e => set('language')(e.target.value)}><Options list={withCurrent(LANGS, form.language)} /></select></div>
          <div className="field"><label htmlFor="p-role">Role</label><input className="input" id="p-role" value={ROLE_LABEL[user.role] || user.role} disabled readOnly /><p className="help">Roles are assigned by a workspace administrator.</p></div>
        </div>
        <div className="modal-f" style={{ marginTop: 6 }}><button type="button" className="btn btn-out" onClick={cancel} disabled={busy || !dirty}>Cancel</button><button className={`btn btn-pri ${busy ? 'loading' : ''}`} disabled={busy}>Save changes</button></div>
      </form>
    </div>
  );
}
