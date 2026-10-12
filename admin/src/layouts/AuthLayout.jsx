import { ShieldCheck, Activity, Users } from 'lucide-react';
import Logo from '../components/layout/Logo';

/** Split-screen layout for public admin pages (login, forgot password). */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12" aria-label="About NEXUS AI Admin">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=85')" }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0f]/70 via-[#0c0c0f]/50 to-[#0c0c0f]" aria-hidden="true" />
        <div className="absolute -left-40 bottom-0 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(217,182,118,.22),transparent_65%)]" aria-hidden="true" />
        <div className="relative"><Logo size={34} /></div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.22em] text-primary"><span className="h-px w-6 bg-primary" />Administration console</p>
          <h2 className="font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-sidebar-text">Run your knowledge platform <span className="font-serif font-normal italic text-primary-strong">with confidence.</span></h2>
          <p className="mt-4 text-[15px] text-sidebar-text/70">Manage users and invitations, curate knowledge sources, monitor processing and review conversations, all in one place.</p>
          <ul className="mt-8 space-y-3 text-[14px] text-sidebar-text/85">
            {[[Users, 'Invitation-based access management'], [Activity, 'Processing and usage monitoring'], [ShieldCheck, 'Review workflows and audit trail']].map(([I, t]) => (
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
