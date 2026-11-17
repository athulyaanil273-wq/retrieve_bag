import { Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface StepItem {
  id: string;
  label: string;
  caption?: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepSelect?: (index: number) => void;
  className?: string;
}

/**
 * Low Cognitive Load: Breaks complex passenger reporting into 3-4 clear progressive steps.
 */
export function StepIndicator({
  steps,
  currentStepIndex,
  onStepSelect,
  className,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Form progress" className={cn('w-full', className)}>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isInteractive = Boolean(onStepSelect && index <= currentStepIndex);

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isInteractive}
                onClick={() => isInteractive && onStepSelect?.(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'w-full min-h-12 px-4 py-3 rounded-2xl border text-left flex items-center gap-3',
                  'transition-[background-color,border-color] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                  isCurrent
                    ? 'bg-navy-800 border-pink-400/50 text-white'
                    : isCompleted
                      ? 'bg-navy-850 border-lavender-300/25 text-slate-200 hover:border-lavender-300/45 cursor-pointer'
                      : 'bg-navy-900/60 border-lavender-300/10 text-slate-400 cursor-default'
                )}
              >
                <span
                  className={cn(
                    'w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-semibold tabular-nums-mono shrink-0',
                    isCurrent
                      ? 'bg-pink-400 text-navy-950'
                      : isCompleted
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-navy-800 text-slate-400 border border-lavender-300/15'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : index + 1}
                </span>

                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{step.label}</span>
                  {step.caption && (
                    <span className="text-xs text-slate-400 truncate">{step.caption}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
