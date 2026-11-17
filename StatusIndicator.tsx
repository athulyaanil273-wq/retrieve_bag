import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Search,
  XCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type {
  ConnectionStatus,
  MatchStatus,
  ReportStatus,
  ReportType,
} from '@/src/types/baggage';

export type SemanticStatus = ReportStatus | ReportType | MatchStatus | ConnectionStatus;

interface StatusMeta {
  label: string;
  colorClass: string;
  icon: typeof CheckCircle2;
}

const STATUS_META: Record<SemanticStatus, StatusMeta> = {
  lost: {
    label: 'Lost Baggage',
    colorClass: 'text-rose-300',
    icon: AlertTriangle,
  },
  found: {
    label: 'Found Baggage',
    colorClass: 'text-lavender-300',
    icon: Search,
  },
  exchanged: {
    label: 'Accidentally Exchanged',
    colorClass: 'text-amber-300',
    icon: ArrowLeftRight,
  },
  open: {
    label: 'Searching for Match',
    colorClass: 'text-lavender-300',
    icon: Search,
  },
  potential_match: {
    label: 'Potential Match Found',
    colorClass: 'text-pink-300',
    icon: CheckCircle2,
  },
  verification_pending: {
    label: 'Verification Pending',
    colorClass: 'text-amber-300',
    icon: Clock,
  },
  reunited: {
    label: 'Bag Reunited',
    colorClass: 'text-emerald-300',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    colorClass: 'text-slate-400',
    icon: Archive,
  },
  suggested: {
    label: 'Suggested Match',
    colorClass: 'text-lavender-300',
    icon: Search,
  },
  under_review: {
    label: 'Under Review',
    colorClass: 'text-amber-300',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed Match',
    colorClass: 'text-emerald-300',
    icon: CheckCircle2,
  },
  dismissed: {
    label: 'Dismissed',
    colorClass: 'text-slate-400',
    icon: XCircle,
  },
  pending: {
    label: 'Awaiting Approval',
    colorClass: 'text-amber-300',
    icon: Clock,
  },
  approved: {
    label: 'Connection Approved',
    colorClass: 'text-emerald-300',
    icon: CheckCircle2,
  },
  declined: {
    label: 'Declined',
    colorClass: 'text-rose-300',
    icon: XCircle,
  },
};

export interface StatusIndicatorProps {
  status: SemanticStatus;
  className?: string;
}

/**
 * Accessibility: Never conveys status by color alone—always pairs semantic color
 * with an explicit icon and clear human-readable label. Zero pill capsules or pulsing dots.
 */
export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0',
        meta.colorClass,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
