/**
 * @file NotificationItem.tsx
 * @description One notification, in the two shapes it appears in.
 *
 * - `compact`: a single tappable row in the bell's dropdown. Tapping opens what it points at.
 * - `card`: a row in the inbox. Tapping expands it (full text, "Open", "Mark as unread").
 *
 * Unread is shown three ways so it never depends on colour alone: a dot, a heavier title,
 * and the word "Unread" for screen readers.
 */
import { createElement } from 'react';
import { Check, ExternalLink, RotateCcw } from 'lucide-react';
import type { Notification } from '@/types';
import { Button, Card } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';
import { iconFor, resolveActionUrl, type Surface } from '@/lib/notifications';
import { cn } from '@/lib/cn';

interface NotificationItemProps {
  notification: Notification;
  surface: Surface;
  variant: 'compact' | 'card';
  /** Card only: whether the details are showing. */
  expanded?: boolean;
  /** Tapping the row. */
  onActivate: () => void;
  /** Card only: "Mark as read / unread". */
  onToggleRead?: () => void;
  /** Card only: "Open". Shown when the notification points somewhere. */
  onOpenLink?: () => void;
  busy?: boolean;
}

function Dot({ unread }: { unread: boolean }) {
  return unread ? (
    <>
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      <span className="sr-only">Unread</span>
    </>
  ) : null;
}

export function NotificationItem({
  notification,
  surface,
  variant,
  expanded = false,
  onActivate,
  onToggleRead,
  onOpenLink,
  busy,
}: NotificationItemProps) {
  const unread = !notification.isRead;
  const hasLink = resolveActionUrl(notification.actionUrl, surface) !== null;
  const when = formatRelative(notification.createdAt);

  const iconBadge = (
    <span
      aria-hidden
      className={cn(
        'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full',
        unread ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
      )}
    >
      {createElement(iconFor(notification.type), { size: 16 })}
    </span>
  );

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 min-h-14"
      >
        {iconBadge}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-body', unread ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>
            {notification.title}
          </span>
          <span className="block truncate text-caption text-slate-500">{notification.body}</span>
          <span className="block text-caption text-slate-400">{when}</span>
        </span>
        <Dot unread={unread} />
      </button>
    );
  }

  return (
    <Card padding="md" accent={unread ? 'primary' : 'none'} className={cn(busy && 'opacity-70')}>
      <button
        type="button"
        onClick={onActivate}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        {iconBadge}
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'text-body',
                unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300',
              )}
            >
              {notification.title}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap text-caption text-slate-500">{when}</span>
              <Dot unread={unread} />
            </span>
          </span>
          <span
            className={cn(
              'mt-1 block whitespace-pre-line text-body-sm text-slate-600 dark:text-slate-400',
              !expanded && 'line-clamp-2',
            )}
          >
            {notification.body}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
          {hasLink && onOpenLink && (
            <Button variant="primary" size="sm" leftIcon={ExternalLink} onClick={onOpenLink}>
              Open
            </Button>
          )}
          {onToggleRead && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={unread ? Check : RotateCcw}
              disabled={busy}
              onClick={onToggleRead}
            >
              {unread ? 'Mark as read' : 'Mark as unread'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
