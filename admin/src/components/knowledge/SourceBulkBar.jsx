import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import { bulkSetCitations } from '../../services/knowledgeService';
import { pluralize } from '../../utils/format';

/**
 * Bulk bar for knowledge sources (same pattern as the Users BulkActionsBar). `sources` = the selected source objects.
 * Hiding a source keeps it in answers; only its citation (source chip, link, excerpt) is no longer shown to users.
 */
export default function SourceBulkBar({ sources, onClear }) {
  const [busy, setBusy] = useState(null);
  const count = sources.length;
  const hiddenCount = sources.filter(s => s.hideCitations).length;

  const apply = async action => {
    const hide = action === 'hide_citations';
    const targets = sources.filter(s => !!s.hideCitations !== hide);
    if (!targets.length) {
      toast.info(hide ? 'The selected sources are already hidden from users.' : 'The selected sources are already shown to users.');
      return;
    }
    setBusy(action);
    try {
      const { updated } = await bulkSetCitations(targets.map(s => s.id), action);
      toast.success(`${pluralize(updated, 'source')} updated.`, {
        description: hide ? 'Still used to answer, but no longer shown to users as cited sources.' : 'Answers that use them now cite them to users.'
      });
      onClear();
    } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };

  if (!count) return null;
  return (
    <div role="region" aria-label="Bulk actions" className="flex flex-col gap-3 border-b border-line bg-primary-soft/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
      <p className="text-[13.5px] font-medium text-ink" aria-live="polite">
        {pluralize(count, 'source')} selected
        {hiddenCount > 0 && <span className="ml-1.5 font-normal text-muted">({formatHidden(hiddenCount, count)})</span>}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" icon={EyeOff} onClick={() => apply('hide_citations')} loading={busy === 'hide_citations'} disabled={!!busy}>Hide sources</Button>
        <Button size="sm" icon={Eye} onClick={() => apply('show_citations')} loading={busy === 'show_citations'} disabled={!!busy}>Show sources</Button>
        <Button size="sm" variant="ghost" icon={X} onClick={onClear} disabled={!!busy}>Clear</Button>
      </div>
    </div>
  );
}

const formatHidden = (hidden, count) => (hidden === count ? 'all hidden from users' : `${hidden} hidden from users`);
