import { UserRound, Building2, BookOpenText, ShieldCheck, Palette, Compass, MessageSquareText } from 'lucide-react';

/** Settings sub-pages, in navigation order. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', to: '/admin/settings/profile', label: 'Profile', icon: UserRound, description: 'Your name, department, avatar, time zone and language.' },
  { id: 'platform', to: '/admin/settings/platform', label: 'Platform', icon: Building2, description: 'Workspace name, registration and upload defaults.' },
  { id: 'knowledge', to: '/admin/settings/knowledge', label: 'Knowledge', icon: BookOpenText, description: 'Source types, chunking, retrieval and citations.' },
  { id: 'security', to: '/admin/settings/security', label: 'Security', icon: ShieldCheck, description: 'Session timeout and access-control policies.' },
  { id: 'domain_policy', to: '/admin/settings/domain-policy', label: 'Domain policy', icon: Compass, description: 'What the assistant may answer, and topics it must refuse.' },
  { id: 'chat', to: '/admin/settings/chat', label: 'Chat limits', icon: MessageSquareText, description: 'Daily question limit and maximum question length.' },
  { id: 'appearance', to: '/admin/settings/appearance', label: 'Appearance', icon: Palette, description: 'Theme, sidebar default and layout density (this browser only).' }
];

export const sectionById = id => SETTINGS_SECTIONS.find(s => s.id === id);
