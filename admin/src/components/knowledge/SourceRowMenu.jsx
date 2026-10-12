import { MoreHorizontal, Eye, Pencil, Play, RotateCcw, Ban, Power, Trash2, Download, RefreshCw } from 'lucide-react';
import DropdownMenu from '../common/DropdownMenu';
import { sourceCapabilities } from './sourceUtils';

/** Row action menu for a knowledge source. Only offers actions valid for the current status. */
export default function SourceRowMenu({ source, activeJob, actions, onEdit }) {
  const can = sourceCapabilities(source, activeJob);
  const items = [
    { label: 'View details', icon: Eye, to: `/admin/knowledge/${source.id}` },
    { label: 'Edit details', icon: Pencil, onClick: () => onEdit(source) },
    (can.start || can.retry || can.reindex) && { divider: true },
    can.start && { label: 'Start processing', icon: Play, onClick: () => actions.start(source) },
    can.reindex && { label: 'Re-index', icon: RefreshCw, onClick: () => actions.start(source, true) },
    can.retry && { label: 'Retry processing', icon: RotateCcw, onClick: () => actions.retry(source) },
    can.download && { label: 'Download original', icon: Download, onClick: () => actions.download(source) },
    { divider: true },
    can.enable && { label: 'Re-enable', icon: Power, onClick: () => actions.enable(source) },
    can.disable && { label: 'Disable', icon: Ban, onClick: () => actions.disable(source) },
    can.busy && !can.enable && { label: 'Disable', icon: Ban, disabled: true, hint: 'Job running' },
    { label: 'Delete', icon: Trash2, danger: true, onClick: () => actions.remove(source) }
  ].filter(Boolean).filter((it, i, arr) => !it.divider || (i > 0 && i < arr.length - 1 && !arr[i - 1].divider));
  return (
    <DropdownMenu label={`Actions for ${source.title}`} items={items}
      trigger={p => <button type="button" {...p} className="icon-btn icon-btn-sm"><MoreHorizontal aria-hidden="true" /></button>} />
  );
}
