import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'lavender' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-pink-400 text-navy-950 font-semibold hover:bg-pink-300 active:scale-[0.99] shadow-[0_6px_20px_-6px_rgba(244,114,182,0.55)]',
  secondary:
    'bg-navy-800 text-slate-100 border border-lavender-300/20 hover:bg-navy-700 hover:border-lavender-300/35 active:scale-[0.99]',
  lavender:
    'bg-lavender-300 text-navy-950 font-semibold hover:bg-lavender-200 active:scale-[0.99]',
  ghost:
    'bg-transparent text-slate-200 hover:bg-navy-800/80 hover:text-white active:scale-[0.99]',
  danger:
    'bg-rose-500/15 text-rose-200 border border-rose-400/35 hover:bg-rose-500/25 active:scale-[0.99]',
};

/**
 * Fitts's Law: All interactive buttons maintain >= 44px minimum target height on touch/pointer viewports.
 * Horizontal padding stays ~2x vertical padding. Single-line labels prevent wrapping distortion.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm rounded-xl',
  md: 'min-h-11 px-5 py-2.5 text-sm rounded-xl',
  lg: 'min-h-12 px-7 py-3 text-base rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap shrink-0 select-none',
          'transition-[background-color,border-color,color,transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'cursor-pointer',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
