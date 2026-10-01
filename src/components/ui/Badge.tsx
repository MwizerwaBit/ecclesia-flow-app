/**
 * @file Badge.tsx
 * @description Status and label badges for member status, batch status, role labels, etc.
 *
 * @prop variant - Semantic color: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
 * @prop size - 'sm' | 'md'
 * @prop dot - Show a colored dot before the label (for status indicators)
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" dot>Open Batch</Badge>
 * <Badge variant="danger" size="sm">Suspended</Badge>
 */
import { cn } from '@/lib/cn';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'platform';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger:  'bg-danger-light text-danger',
  info:    'bg-info-light text-info',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  primary: 'bg-primary-light text-primary',
  platform: 'bg-slate-900 text-white',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  neutral: 'bg-slate-400',
  primary: 'bg-primary',
  platform: 'bg-white',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-caption rounded-md gap-1',
  md: 'px-2.5 py-1 text-caption rounded-full gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-sans font-bold uppercase tracking-wider',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('shrink-0 rounded-full', dotClasses[variant], size === 'sm' ? 'size-1.5' : 'size-2')}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

// ─── Convenience wrappers for member status ───────────────────────────────────

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  visitor: 'info',
  inactive: 'neutral',
  prospect: 'warning',
  open: 'warning',
  closed: 'neutral',
  posted: 'success',
  trial: 'warning',
  suspended: 'danger',
  canceled: 'danger',
  draft: 'neutral',
  published: 'success',
  scheduled: 'info',
  archived: 'neutral',
  fulfilled: 'success',
  overdue: 'danger',
};

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const variant = STATUS_VARIANT[status.toLowerCase()] ?? 'neutral';
  return (
    <Badge variant={variant} size={size} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
