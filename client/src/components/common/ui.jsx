import { TYPES, groupOf } from '../../data/config';
import Icon from './Icon';

export function EmptyState({ icon, title, text, children }) {
  return (
    <div className="empty">
      <div className="eico"><Icon name={icon} /></div>
      <h3>{title}</h3><p>{text}</p>{children}
    </div>
  );
}

/** Error panel in the same style as the empty state, with an optional retry. */
export function ErrorState({ error, title = 'Could not load this', onRetry }) {
  return (
    <EmptyState icon="alert-circle" title={title} text={(error && error.message) || 'Something went wrong. Please try again.'}>
      {onRetry && <button className="btn btn-out" onClick={onRetry}><Icon name="refresh-cw" />Try again</button>}
    </EmptyState>
  );
}

/** Badge for a source's group. Accepts a Source or a citation ({ sourceType }). */
export const TypeBadge = ({ s }) => { const g = groupOf(s), t = TYPES[g]; return <span className={`badge tbadge t-${g}`}><Icon name={t.icon} />{t.label}</span>; };

const STATUS = {
  indexed: ['ok', 'check-circle', 'Indexed'],
  processing: ['warn', 'clock', 'Processing'],
  pending: ['warn', 'clock', 'Queued'],
  failed: ['', 'alert-circle', 'Failed'],
  disabled: ['', 'eye-off', 'Disabled']
};
export const StatusBadge = ({ s }) => { const [cls, icon, label] = STATUS[s.status] || ['', 'info', s.status || 'Unknown']; return <span className={`badge ${cls}`}><Icon name={icon} />{label}</span>; };

/** <option> list from ['value', ...] or [['value', 'label'], ...]. */
export const Options = ({ list }) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; });
