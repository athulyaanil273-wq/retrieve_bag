import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
  maxCharacters?: number;
  currentLength?: number;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      maxCharacters,
      currentLength,
      containerClassName,
      className,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-slate-200 flex items-center gap-1"
          >
            <span>{label}</span>
            {required && (
              <span className="text-pink-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {typeof maxCharacters === 'number' && typeof currentLength === 'number' && (
            <span className="text-xs text-slate-400 tabular-nums-mono">
              {currentLength}/{maxCharacters}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          maxLength={maxCharacters}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full min-h-24 rounded-xl bg-navy-800 border p-3.5 text-sm text-slate-100 placeholder:text-slate-400/80',
            'transition-[border-color,background-color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            'focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/25',
            error
              ? 'border-rose-400/80 focus:border-rose-400 focus:ring-rose-400/25'
              : 'border-lavender-300/20 hover:border-lavender-300/35',
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
