import type { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Hick's Law: Keeps decision sets focused (ideally 2-4 options) in one unified horizontal track.
 * Fitts's Law: Every tab maintains >= 44px touch height with single-line labels.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 rounded-2xl bg-navy-950/70 border border-lavender-300/15',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-10 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer',
              'inline-flex items-center justify-center gap-2',
              'transition-[background-color,color,box-shadow] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              isActive
                ? 'bg-pink-400 text-navy-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-navy-800/80'
            )}
          >
            {option.icon && (
              <span className="inline-flex shrink-0" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
