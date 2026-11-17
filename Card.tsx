import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_MAP = {
  none: '',
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

/**
 * Single-elevation rounded card with subtle hairline border (Gestalt Common Region).
 * Never nested inside other bordered cards; uses generous internal spacing >= inner child gaps.
 */
export function Card({
  className,
  interactive = false,
  padding = 'md',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-navy-850 border border-lavender-300/14 rounded-[20px] text-slate-100',
        'transition-[border-color,background-color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        interactive && 'hover:border-pink-400/40 hover:bg-navy-800/80',
        PADDING_MAP[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight text-slate-50 leading-snug', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-300 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 pt-4 border-t border-lavender-300/10 flex items-center justify-between gap-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface StatMetricItemProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}

export function StatMetricItem({ label, value, detail, icon }: StatMetricItemProps) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        {icon && <span className="text-lavender-300 shrink-0" aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-50 tabular-nums-mono tracking-tight">
        {value}
      </div>
      {detail && <p className="text-xs text-slate-400">{detail}</p>}
    </div>
  );
}
