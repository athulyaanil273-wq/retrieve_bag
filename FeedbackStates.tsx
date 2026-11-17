import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  tone?: AlertTone;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const TONE_MAP: Record<
  AlertTone,
  { container: string; iconColor: string; icon: typeof Info }
> = {
  info: {
    container: 'bg-lavender-300/10 border-lavender-300/25 text-slate-100',
    iconColor: 'text-lavender-300',
    icon: Info,
  },
  success: {
    container: 'bg-emerald-400/10 border-emerald-400/25 text-slate-100',
    iconColor: 'text-emerald-300',
    icon: CheckCircle2,
  },
  warning: {
    container: 'bg-amber-400/10 border-amber-400/25 text-slate-100',
    iconColor: 'text-amber-300',
    icon: AlertCircle,
  },
  error: {
    container: 'bg-rose-400/10 border-rose-400/30 text-slate-100',
    iconColor: 'text-rose-300',
    icon: AlertCircle,
  },
};

/**
 * Clean all-around hairline border alert (never uses thick left border bars).
 */
export function Alert({
  tone = 'info',
  title,
  description,
  action,
  className,
}: AlertProps) {
  const meta = TONE_MAP[tone];
  const Icon = meta.icon;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        meta.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', meta.iconColor)} aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-slate-50">{title}</p>
          {description && <p className="text-sm text-slate-300 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-lavender-300/15 bg-navy-850/70 px-6 py-10 text-center flex flex-col items-center justify-center gap-4',
        className
      )}
    >
      {illustration && <div className="mb-1">{illustration}</div>}
      <div className="max-w-md flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl bg-navy-800/80 animate-pulse', className)}
    />
  );
}
