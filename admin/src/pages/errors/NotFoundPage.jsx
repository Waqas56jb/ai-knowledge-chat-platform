import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useMisc';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Logo from '../../components/layout/Logo';

/** Full-page 404 (also used inside the shell via `embedded`). */
export default function NotFoundPage({ embedded = false, title = 'Page not found', message = 'The page you are looking for does not exist or may have been moved.', backTo, backLabel }) {
  useDocumentTitle(title);
  const { session } = useAuth();
  const home = session ? '/admin/dashboard' : '/login';
  const body = (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="font-display text-[88px] font-semibold leading-none tracking-tight" style={{ backgroundImage: 'linear-gradient(135deg,#f3dcaa,#d9b676 55%,#a8823f)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>404</p>
      <span className="mt-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-text"><Compass className="h-5 w-5" aria-hidden="true" /></span>
      <h1 className="mt-4 text-[22px] font-semibold">{title}</h1>
      <p className="mt-1.5 max-w-md text-[14px] text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {backTo && <Button as={Link} to={backTo} icon={ArrowLeft}>{backLabel}</Button>}
        <Button as={Link} to={home} variant="primary">{session ? 'Go to dashboard' : 'Go to sign in'}</Button>
      </div>
    </div>
  );
  if (embedded) return <div className="card">{body}</div>;
  return <main id="main" className="grid min-h-dvh place-items-center bg-bg"><div><div className="flex justify-center"><Logo tone="dark" /></div>{body}</div></main>;
}
