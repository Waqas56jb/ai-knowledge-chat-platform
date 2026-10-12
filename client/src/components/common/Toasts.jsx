import { useApp } from '../../context/AppContext';
import Icon from './Icon';

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div id="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <Icon name={t.kind === 'err' ? 'alert-circle' : t.kind === 'info' ? 'info' : 'check-circle'} /><span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
