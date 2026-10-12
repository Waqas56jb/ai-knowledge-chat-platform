import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import Tooltip from './Tooltip';

const VARIANT = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger', 'danger-ghost': 'btn-danger-ghost' };
const SIZE = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/**
 * <Button variant="primary|secondary|ghost|danger|danger-ghost" size="sm|md|lg" icon={Plus} loading as={Link} to="/x">Label</Button>
 */
const Button = forwardRef(function Button({ as: As = 'button', variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, disabled, className, children, type, ...rest }, ref) {
  return (
    <As ref={ref} className={cn('btn', VARIANT[variant], SIZE[size], className)} disabled={As === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined} type={As === 'button' ? type || 'button' : undefined} {...rest}>
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : Icon && <Icon aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight aria-hidden="true" />}
    </As>
  );
});
export default Button;

/** Icon-only button. `label` is required: it becomes the aria-label and the tooltip. */
export const IconButton = forwardRef(function IconButton({ as: As = 'button', icon: Icon, label, size = 'md', tooltip = true, className, tooltipSide = 'bottom', ...rest }, ref) {
  const btn = (
    <As ref={ref} className={cn('icon-btn', size === 'sm' && 'icon-btn-sm', className)} aria-label={label} type={As === 'button' ? 'button' : undefined} {...rest}>
      <Icon aria-hidden="true" />
    </As>
  );
  return tooltip ? <Tooltip label={label} side={tooltipSide}>{btn}</Tooltip> : btn;
});
