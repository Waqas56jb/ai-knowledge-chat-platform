import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, Send, Info, AlertCircle } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { requestPasswordReset } from '../../services/authService';
import { useDocumentTitle } from '../../hooks/useMisc';
import Button from '../../components/common/Button';
import { FormField, Input } from '../../components/forms/FormField';

const schema = z.object({ email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.') });

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset password');
  const [sentTo, setSentTo] = useState('');
  const [failure, setFailure] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const onSubmit = async ({ email }) => {
    setFailure('');
    try { const r = await requestPasswordReset(email); setSentTo(r.email); } catch (err) { setFailure(err.message); }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign in</Link>
      <h1 className="text-[30px] font-semibold leading-tight">Reset your <span className="serif-accent text-[1.1em]">password</span></h1>
      <p className="mt-1.5 text-[14px] text-muted">Enter the email address of your administrator account.</p>
      {sentTo ? (
        <div className="mt-6 rounded-xl border border-info/30 bg-info-soft p-4 text-[13.5px] text-ink" role="status">
          <p className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-info" aria-hidden="true" />Check your inbox</p>
          <p className="mt-1 text-muted">If an account exists for <b className="text-ink">{sentTo}</b>, a password reset link has been sent to it. The link expires after a short time.</p>
          <Button as={Link} to="/login" variant="primary" className="mt-4">Return to sign in</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          {failure && <div className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] text-danger" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{failure}</div>}
          <FormField label="Email" error={errors.email?.message} id="fp-email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input id="fp-email" type="email" autoComplete="email" placeholder="admin@company.com" className="h-11 pl-10" aria-invalid={errors.email ? 'true' : 'false'} {...register('email')} />
            </div>
          </FormField>
          <Button type="submit" variant="primary" size="lg" icon={Send} loading={isSubmitting} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
