import { ChevronDown, ClipboardCheck } from 'lucide-react';
import Button from '../common/Button';
import DropdownMenu from '../common/DropdownMenu';
import { REVIEW_OPTIONS, useReviewStatus } from './reviewOptions';

/** "Review" dropdown in the conversation header. */
export default function ReviewStatusMenu({ conversationId, current }) {
  const [change, pending] = useReviewStatus(conversationId);
  const items = REVIEW_OPTIONS.flatMap(o => [
    o.value === 'unreviewed' ? { divider: true } : null,
    { label: o.label, icon: o.icon, disabled: o.value === current || !!pending, hint: o.value === current ? 'Current' : undefined, onClick: () => change(o.value) }
  ]).filter(Boolean);
  return (
    <DropdownMenu label="Set review status" width="w-64" items={items}
      header={<p className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Set review status</p>}
      trigger={props => <Button {...props} variant="primary" icon={ClipboardCheck} iconRight={ChevronDown} loading={!!pending}>Review</Button>} />
  );
}
