import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from './Badge';

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: string;
}

const statusColorMap: Record<string, BadgeColor> = {
  // Green statuses
  active: 'green',
  completed: 'green',
  resolved: 'green',
  paid: 'green',
  approved: 'green',
  on_time: 'green',
  open: 'green',

  // Blue statuses
  in_progress: 'blue',
  partially_paid: 'blue',
  ongoing: 'blue',
  under_review: 'blue',
  assigned: 'blue',

  // Yellow statuses
  pending: 'yellow',
  scheduled: 'yellow',
  draft: 'yellow',
  due: 'yellow',
  awaiting: 'yellow',
  on_hold: 'yellow',
  review: 'yellow',
  deferred: 'yellow',

  // Gray statuses
  closed: 'gray',
  cancelled: 'gray',
  expired: 'gray',
  revoked: 'gray',
  archived: 'gray',
  inactive: 'gray',
  void: 'gray',

  // Red statuses
  overdue: 'red',
  critical: 'red',
  blocked: 'red',
  emergency: 'red',
  failed: 'red',
  rejected: 'red',
  escalated: 'red',
  urgent: 'red',
  breached: 'red',

  // Priority colors
  high: 'orange',
  medium: 'yellow',
  low: 'green',
};

function formatStatus(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusBadge({ status, className = '', ...props }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const badgeColor: BadgeColor = statusColorMap[normalized] ?? 'gray';
  const label = formatStatus(status);

  return (
    <Badge {...props} color={badgeColor} className={className}>
      {label}
    </Badge>
  );
}

export default StatusBadge;
