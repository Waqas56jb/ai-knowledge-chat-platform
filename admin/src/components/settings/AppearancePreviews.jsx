import { cn } from '../../utils/cn';

/*
 * Miniature UI previews for the appearance option cards. Theme previews must show a fixed theme
 * regardless of the one currently active, so they use Tailwind's neutral stone scale instead of
 * the theme tokens; the gold accent and sidebar still come from tokens.
 */
const THEME = {
  light: { frame: 'bg-stone-100', card: 'bg-white', line: 'bg-stone-200', text: 'bg-stone-300' },
  dark: { frame: 'bg-stone-950', card: 'bg-stone-900', line: 'bg-stone-800', text: 'bg-stone-700' }
};

function ThemeMini({ tone, className }) {
  const t = THEME[tone];
  return (
    <span className={cn('flex h-[72px] w-full overflow-hidden rounded-lg border border-line', t.frame, className)}>
      <span className="flex w-[22%] flex-col gap-1 bg-sidebar p-1.5">
        <span className="h-1.5 w-3/4 rounded-full bg-primary" />
        <span className="mt-1 h-1 w-full rounded-full bg-sidebar-muted/50" />
        <span className="h-1 w-4/5 rounded-full bg-sidebar-muted/50" />
        <span className="h-1 w-full rounded-full bg-sidebar-muted/50" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className={cn('h-1.5 w-1/2 rounded-full', t.text)} />
        <span className="grid flex-1 grid-cols-2 gap-1.5">
          <span className={cn('rounded-md p-1', t.card)}><span className="block h-1 w-2/3 rounded-full bg-primary/80" /></span>
          <span className={cn('rounded-md p-1', t.card)}><span className={cn('block h-1 w-1/2 rounded-full', t.line)} /></span>
        </span>
      </span>
    </span>
  );
}

export function ThemePreview({ theme }) {
  if (theme !== 'system') return <ThemeMini tone={theme} />;
  return (
    <span className="relative block h-[72px] w-full">
      <ThemeMini tone="dark" className="absolute inset-0" />
      <ThemeMini tone="light" className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
    </span>
  );
}

/** Sidebar width preview (theme tokens, follows the active theme). */
export function SidebarPreview({ collapsed }) {
  return (
    <span className="flex h-[60px] w-full overflow-hidden rounded-lg border border-line bg-subtle">
      <span className={cn('flex flex-col gap-1 bg-sidebar p-1.5', collapsed ? 'w-[12%] items-center' : 'w-[34%]')}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="flex items-center gap-1">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-sm', i === 0 ? 'bg-primary' : 'bg-sidebar-muted/60')} />
            {!collapsed && <span className="h-1 w-8 rounded-full bg-sidebar-muted/50" />}
          </span>
        ))}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-2"><span className="h-1.5 w-1/2 rounded-full bg-line" /><span className="flex-1 rounded-md bg-surface" /></span>
    </span>
  );
}

/** Row-spacing preview. */
export function DensityPreview({ compact }) {
  return (
    <span className={cn('flex h-[60px] w-full flex-col justify-center overflow-hidden rounded-lg border border-line bg-surface px-2.5', compact ? 'gap-1' : 'gap-2.5')}>
      {[0, 1, 2].map(i => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" />
          <span className="h-1 flex-1 rounded-full bg-line" />
          <span className="h-1 w-6 rounded-full bg-line" />
        </span>
      ))}
    </span>
  );
}
