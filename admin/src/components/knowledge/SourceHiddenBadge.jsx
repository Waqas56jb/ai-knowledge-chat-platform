import { EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Marks a source whose citation is hidden from users (it is still used to answer). */
export default function SourceHiddenBadge({ className }) {
  return (
    <span className={cn('badge badge-neutral', className)} title="Still used to answer, but not shown to users as a cited source (no source chip, link or excerpt).">
      <EyeOff aria-hidden="true" />Source hidden
    </span>
  );
}
