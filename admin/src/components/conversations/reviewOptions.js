import { useState } from 'react';
import { toast } from 'sonner';
import { CircleDashed, CheckCircle2, AlertTriangle, ShieldAlert, FileWarning } from 'lucide-react';
import { REVIEW_STATUSES } from '../../constants/domain';
import { setReviewStatus } from '../../services/conversationService';

/** Review statuses with icons, in the order an administrator would choose them. */
export const REVIEW_OPTIONS = [
  { value: 'reviewed', label: REVIEW_STATUSES.reviewed, icon: CheckCircle2, hint: 'Answer and citations check out.' },
  { value: 'needs_attention', label: REVIEW_STATUSES.needs_attention, icon: AlertTriangle, hint: 'Something needs a follow-up.' },
  { value: 'unsupported', label: REVIEW_STATUSES.unsupported, icon: ShieldAlert, hint: 'The answer is not backed by its sources.' },
  { value: 'source_mismatch', label: REVIEW_STATUSES.source_mismatch, icon: FileWarning, hint: 'Cited sources do not match the question.' },
  { value: 'unreviewed', label: REVIEW_STATUSES.unreviewed, icon: CircleDashed, hint: 'Clear the review decision.' }
];

/** Change a conversation's review status with toast feedback. Returns [change, pendingStatus]. */
export function useReviewStatus(conversationId) {
  const [pending, setPending] = useState(null);
  const change = async status => {
    setPending(status);
    try {
      await setReviewStatus(conversationId, status);
      toast.success(status === 'unreviewed' ? 'Review status cleared.' : `Marked as “${REVIEW_STATUSES[status]}”.`, { description: 'The change was recorded in the audit log.' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPending(null);
    }
  };
  return [change, pending];
}
