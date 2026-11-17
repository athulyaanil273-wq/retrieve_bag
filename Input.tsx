import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightAdornment?: ReactNode;
  containerClassName?: string;
  mono?: boolean;
}

/**
 * Accessible form input with built-in error prevention hints, >= 44px target height,
 * explicit label linkage, and ARIA error binding.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightAdornment,
      containerClassName,
      className,
      id,
      required,
      mono = false,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        <label
          htmlFor={inputId}
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
          {leftIcon && (
            <span
              className="absolute left-3.5 text-slate-400 pointer-events-none inline-flex"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full min-h-11 rounded-xl bg-navy-800 border text-slate-100 placeholder:text-slate-400/80 text-sm',
              'transition-[border-color,background-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              'focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/25',
              leftIcon ? 'pl-10' : 'px-3.5',
              rightAdornment ? 'pr-10' : 'pr-3.5',
              mono && 'font-mono tabular-nums tracking-wide',
              error
                ? 'border-rose-400/80 focus:border-rose-400 focus:ring-rose-400/25'
                : 'border-lavender-300/20 hover:border-lavender-300/35',
              className
            )}
            {...props}
          />

          {rightAdornment && (
            <span className="absolute right-3 inline-flex items-center text-slate-400">
              {rightAdornment}
            </span>
          )}
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

Input.displayName = 'Input';
