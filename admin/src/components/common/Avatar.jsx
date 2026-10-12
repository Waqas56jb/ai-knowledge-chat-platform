import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';

const TONES = [
  'bg-[#f4ead6] text-[#7a5a1c] dark:bg-[#2a2214] dark:text-[#f0d29a]',
  'bg-[#e2f1ec] text-[#2f6b5c] dark:bg-[#0f2a23] dark:text-[#8fd6c0]',
  'bg-[#f1e8f5] text-[#6b4c7c] dark:bg-[#271a30] dark:text-[#d6b8e8]',
  'bg-[#e3eef9] text-[#2e5f94] dark:bg-[#10213a] dark:text-[#9cc4ee]',
  'bg-[#fbe7e3] text-[#a2402f] dark:bg-[#33150f] dark:text-[#ff9a8c]'
];
const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-[11.5px]', md: 'h-9 w-9 text-[12.5px]', lg: 'h-12 w-12 text-[15px]', xl: 'h-16 w-16 text-[20px]' };
const tone = name => TONES[[...(name || '?')].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];

/** Initials avatar with a stable colour per name. `gold` uses the brand gradient (admin). */
export default function Avatar({ name, size = 'md', gold = false, className }) {
  return (
    <span aria-hidden="true" className={cn('inline-grid shrink-0 select-none place-items-center rounded-full font-semibold', SIZES[size], gold ? 'text-primary-fg' : tone(name), className)}
      style={gold ? { backgroundImage: 'linear-gradient(135deg,#f3dcaa,#d9b676 55%,#a8823f)' } : undefined}>
      {initials(name)}
    </span>
  );
}

/** Avatar + name (+ email) block used in tables and lists. */
export function UserAvatar({ user, size = 'md', showEmail = true, className }) {
  if (!user) return <span className="text-muted">Deleted user</span>;
  return (
    <span className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar name={user.name} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{user.name}</span>
        {showEmail && user.email && <span className="block truncate text-[12.5px] text-muted">{user.email}</span>}
      </span>
    </span>
  );
}
