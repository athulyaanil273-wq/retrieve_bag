import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      helperText,
      error,
      containerClassName,
      className,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-slate-200 flex items-center gap-1"
        >
          <span>{label}</span>
          {required && (
            <span className="text-pink-400" aria-hidden="true">
              *
            </span>
          )}
        </label>

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full min-h-11 appearance-none rounded-xl bg-navy-800 border pl-3.5 pr-10 text-sm text-slate-100',
              'transition-[border-color,background-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              'focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/25 cursor-pointer',
              error
                ? 'border-rose-400/80 focus:border-rose-400 focus:ring-rose-400/25'
                : 'border-lavender-300/20 hover:border-lavender-300/35',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-navy-900 text-slate-100"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="w-4 h-4 text-lavender-300 pointer-events-none absolute right-3.5"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-rose-300 mt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-xs text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
