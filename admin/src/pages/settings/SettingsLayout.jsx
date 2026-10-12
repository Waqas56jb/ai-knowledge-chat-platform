import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../utils/cn';
import PageHeader from '../../components/common/PageHeader';
import { SETTINGS_SECTIONS } from '../../components/settings/sections';

const LINKS = [{ id: 'overview', to: '/admin/settings', label: 'Overview', icon: LayoutGrid, end: true }, ...SETTINGS_SECTIONS];

/** Settings shell: page header, secondary navigation (tabs on mobile, vertical list from lg) and the section. */
export default function SettingsLayout() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace configuration stored on the server, plus your own profile and display preferences." />
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Settings sections" className="-mx-4 mb-6 border-b border-line px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mb-0 lg:self-start lg:border-0 lg:px-0 lg:sticky lg:top-24">
          <ul className="flex gap-1 overflow-x-auto pb-px lg:flex-col lg:overflow-visible lg:pb-0">
            {LINKS.map(l => (
              <li key={l.id} className="shrink-0">
                <NavLink to={l.to} end={l.end}
                  className={({ isActive }) => cn(
                    'relative flex items-center gap-2.5 whitespace-nowrap text-[13.5px] font-medium transition',
                    'border-b-2 px-3 py-2.5 lg:rounded-lg lg:border-b-0 lg:py-2',
                    isActive ? 'border-primary-strong text-ink lg:bg-surface lg:shadow-card lg:ring-1 lg:ring-line' : 'border-transparent text-muted hover:text-ink lg:hover:bg-subtle'
                  )}>
                  {({ isActive }) => (<>
                    <l.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-text' : 'text-faint')} aria-hidden="true" />
                    {l.label}
                  </>)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </>
  );
}
