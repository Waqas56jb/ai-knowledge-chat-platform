import { ShieldCheck, BookOpen, Users } from 'lucide-react';
import Logo from '../components/layout/Logo';

/** Split-screen layout for public admin pages (login, forgot password). */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12" aria-label="About DTS AI Admin">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=3840&q=90')" }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0f]/70 via-[#0c0c0f]/50 to-[#0c0c0f]" aria-hidden="true" />
        <div className="absolute -left-40 bottom-0 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(217,182,118,.22),transparent_65%)]" aria-hidden="true" />
        <div className="relative"><Logo size={34} /></div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.22em] text-primary"><span className="h-px w-6 bg-primary" />DTS AI administration</p>
          <h2 className="font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-sidebar-text">Expert knowledge for the supply business, <span className="font-serif font-normal italic text-primary-strong">kept sharp.</span></h2>
          <p className="mt-4 text-[15px] text-sidebar-text/70">Curate the videos and documents behind DTS AI, manage who gets access, and close the gaps in what entrepreneurs in diabetic testing supply resale are asking.</p>
          <ul className="mt-8 space-y-3 text-[14px] text-sidebar-text/85">
            {[[BookOpen, 'Expert videos and documents in one knowledge base'], [Users, 'Invitation-only access for your members'], [ShieldCheck, 'Unanswered-question review and audit trail']].map(([I, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary"><I className="h-3.5 w-3.5" aria-hidden="true" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-sidebar-muted">Administrator accounts only. Every action is authorized by the server and recorded in the audit log.</p>
      </aside>
      <main id="main" className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><Logo size={32} tone="dark" /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
