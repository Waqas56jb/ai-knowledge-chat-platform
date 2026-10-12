import { cloneElement, forwardRef, isValidElement, useId } from 'react';
import { cn } from '../../utils/cn';

/**
 * Label + control + help/error, wired for screen readers.
 * <FormField label="Email" error={errors.email?.message} help="..." required>
 *   <Input type="email" {...register('email')} />
 * </FormField>
 * The child receives id, aria-invalid and aria-describedby automatically.
 */
export function FormField({ label, error, help, required, children, className, id: idProp, labelHidden = false, optional = false }) {
  const auto = useId();
  const id = idProp || auto;
  const describedBy = [help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  // Only wire up real controls; a wrapper <div> (e.g. input with an icon) is left untouched and wires its own input.
  const control = isValidElement(children) && children.type !== 'div' ? cloneElement(children, { id: children.props.id || id, 'aria-invalid': error ? 'true' : 'false', 'aria-describedby': describedBy, required: children.props.required ?? required }) : children;
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={children?.props?.id || id} className={cn('label', labelHidden && 'sr-only')}>
        {label}{required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}{optional && <span className="ml-1.5 text-[12px] font-normal text-faint">Optional</span>}
      </label>
      {control}
      {help && !error && <p id={`${id}-help`} className="field-help">{help}</p>}
      {error && <p id={`${id}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('input', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('textarea', className)} {...rest} />;
});

/** Native select. options: ['a', 'b'] or [['value', 'Label'], ...] */
export const Select = forwardRef(function Select({ options = [], className, placeholder, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('select', className)} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
});

/** Checkbox with label text. */
export const Checkbox = forwardRef(function Checkbox({ label, description, className, id: idProp, ...rest }, ref) {
  const auto = useId(); const id = idProp || auto;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5 text-[13.5px]', className)}>
      <input ref={ref} id={id} type="checkbox" className="checkbox mt-0.5" {...rest} />
      <span><span className="text-ink">{label}</span>{description && <span className="block text-[12.5px] text-muted">{description}</span>}</span>
    </label>
  );
});

/** On/off switch (a styled checkbox with role="switch"). */
export const Switch = forwardRef(function Switch({ checked, onChange, label, description, disabled, className, id: idProp }, ref) {
  const auto = useId(); const id = idProp || auto;
  return (
    <div className={cn('flex items-start justify-between gap-6', className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </label>
      <button ref={ref} id={id} type="button" role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50', checked ? 'bg-primary-strong' : 'bg-line')}>
        <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
});
