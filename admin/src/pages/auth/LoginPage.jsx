import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, AlertCircle, LogIn, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useMisc';
import { takeSignOutReason } from '../../services/sessionStore';
import Button from '../../components/common/Button';
import { FormField, Input, Checkbox } from '../../components/forms/FormField';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean()
});

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [show, setShow] = useState(false);
  const [authError, setAuthError] = useState(null);
  // why the previous session ended (expired token, not an admin, suspended), shown once
  const [notice] = useState(() => takeSignOutReason());
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', remember: true } });

  const onSubmit = async values => {
    setAuthError(null);
    const res = await login(values.email, values.password, values.remember);
    if (!res.ok) { setAuthError({ code: res.code, message: res.error }); return; }
    const first = (res.session.user.fullName || res.session.user.email || '').split(/[\s@]/)[0];
    toast.success(`Welcome back${first ? `, ${first}` : ''}.`, { description: 'Signed in to the NEXUS AI admin console.' });
    navigate(state?.from && state.from.startsWith('/admin') ? state.from : '/admin/dashboard', { replace: true });
  };
  const errorTitle = !authError ? '' : authError.code === 'ADMIN_REQUIRED' ? 'Admin access required.'
    : authError.code === 'INVALID_CREDENTIALS' ? 'Invalid credentials.'
      : authError.code === 'ACCOUNT_SUSPENDED' ? 'Account unavailable.'
        : authError.code === 'RATE_LIMITED' ? 'Too many attempts.' : 'Sign-in failed.';
  const NOTICES = {
    expired: 'Your session expired. Sign in again to continue.',
    admin_required: 'Admin access required. Your account does not have administrator permissions.',
    suspended: 'Your account has been suspended. Contact another administrator.'
  };

  return (
    <AuthLayout>
      <h1 className="text-[30px] font-semibold leading-tight">Welcome <span className="serif-accent text-[1.1em]">back</span></h1>
      <p className="mt-1.5 text-[14px] text-muted">Sign in to the NEXUS AI admin console.</p>

      {notice && !authError && (
        <div className="mt-6 flex gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-[13px] text-ink" role="status"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />{NOTICES[notice] || NOTICES.expired}</div>
      )}
      {!notice && state?.reason === 'auth' && !authError && (
        <div className="mt-6 flex gap-2.5 rounded-xl border border-info/30 bg-info-soft px-3.5 py-3 text-[13px] text-info" role="status"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Sign in to continue to the admin console.</div>
      )}
      {authError && (
        <div className="mt-6 flex gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] text-danger" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><b>{errorTitle}</b> {authError?.code === 'ADMIN_REQUIRED' ? 'This console is only available to administrator accounts.' : authError?.message}</span></div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <FormField label="Email" error={errors.email?.message} id="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="username" placeholder="admin@company.com" className="h-11 pl-10" aria-invalid={errors.email ? 'true' : 'false'} aria-describedby={errors.email ? 'email-err' : undefined} {...register('email')} />
          </div>
        </FormField>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">Password</label>
            <Link to="/forgot-password" className="link text-[13px]">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" className="h-11 pl-10 pr-11"
              aria-invalid={errors.password ? 'true' : 'false'} aria-describedby={errors.password ? 'password-err' : undefined} {...register('password')} />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-faint hover:bg-subtle hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="password-err" className="field-error" role="alert">{errors.password.message}</p>}
        </div>
        <Checkbox label="Remember me on this device" {...register('remember')} />
        <Button type="submit" variant="primary" size="lg" icon={LogIn} loading={isSubmitting} className="w-full">{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <p className="mt-6 text-[12.5px] text-faint">Only administrator accounts can sign in here. Members use the NEXUS AI app.</p>
    </AuthLayout>
  );
}
