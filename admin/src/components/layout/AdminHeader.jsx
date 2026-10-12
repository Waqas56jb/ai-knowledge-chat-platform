import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, HelpCircle, LogOut, UserCog, Settings, BookOpen, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { getAppearance, saveAppearance, subscribeAppearance } from '../../services/settingsService';
import { IconButton } from '../common/Button';
import DropdownMenu from '../common/DropdownMenu';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Breadcrumbs from './Breadcrumbs';
import GlobalSearch from './GlobalSearch';
import NotificationMenu from './NotificationMenu';

const themeOf = () => getAppearance().theme;

export default function AdminHeader({ onMenu }) {
  const { name, user, logout } = useAuth();
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const theme = useSyncExternalStore(subscribeAppearance, themeOf, themeOf);
  const isDark = document.documentElement.classList.contains('dark');

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    saveAppearance({ theme: next });
    toast.success(`${next === 'dark' ? 'Dark' : 'Light'} theme applied.`);
  };
  const signOut = async () => { await logout(); toast.success('Signed out.'); navigate('/login'); };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-6">
      <IconButton icon={Menu} label="Open navigation" onClick={onMenu} className="lg:hidden" tooltip={false} />
      <div className="min-w-0 flex-1"><Breadcrumbs /></div>
      <GlobalSearch />
      <div className="flex items-center gap-0.5">
        <IconButton icon={isDark ? Sun : Moon} label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme} className="hidden sm:inline-grid" data-theme={theme} />
        <IconButton icon={HelpCircle} label="Help and documentation" onClick={() => setHelp(true)} className="hidden sm:inline-grid" />
        <NotificationMenu />
        <DropdownMenu label="Profile menu" width="w-60"
          trigger={p => <button type="button" {...p} className="ml-1 rounded-full ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-primary/40"><Avatar name={name} gold size="sm" /></button>}
          header={<div className="mb-1 flex items-center gap-3 border-b border-line px-2.5 pb-2.5 pt-1"><Avatar name={name} gold size="md" /><div className="min-w-0"><p className="truncate text-[13.5px] font-semibold">{name}</p><p className="truncate text-[12px] text-muted">{user?.email}</p></div></div>}
          items={[
            { label: 'Profile', icon: UserCog, to: '/admin/settings/profile' },
            { label: 'Settings', icon: Settings, to: '/admin/settings' },
            { label: isDark ? 'Light theme' : 'Dark theme', icon: isDark ? Sun : Moon, onClick: toggleTheme },
            { label: 'Help', icon: HelpCircle, onClick: () => setHelp(true) },
            { divider: true },
            { label: 'Sign out', icon: LogOut, onClick: signOut, danger: true }
          ]} />
      </div>

      <Modal open={help} onClose={() => setHelp(false)} title="Help & documentation" description="Quick reference for the NEXUS AI admin console." size="lg"
        footer={<Button variant="primary" onClick={() => setHelp(false)}>Done</Button>}>
        <div className="space-y-5 text-[13.5px]">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><BookOpen className="h-4 w-4 text-primary-text" aria-hidden="true" />About this console</h3>
            <p className="text-muted">Every screen reads and writes the NEXUS AI API. Users, invitations, knowledge sources, processing jobs, conversations, analytics, audit logs and settings are live server data, and every administrative action is authorized by the server and written to the audit log. Invitations are not emailed: share the link shown when you create or resend one.</p>
          </section>
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold"><Keyboard className="h-4 w-4 text-primary-text" aria-hidden="true" />Keyboard shortcuts</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2"><span>Open search</span><span><span className="kbd">Ctrl</span> <span className="kbd">K</span> or <span className="kbd">/</span></span></li>
              <li className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2"><span>Close dialogs and menus</span><span className="kbd">Esc</span></li>
              <li className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2"><span>Move in search results</span><span><span className="kbd">↑</span> <span className="kbd">↓</span></span></li>
              <li className="flex items-center justify-between rounded-lg bg-subtle px-3 py-2"><span>Switch tabs</span><span><span className="kbd">←</span> <span className="kbd">→</span></span></li>
            </ul>
          </section>
        </div>
      </Modal>
    </header>
  );
}
