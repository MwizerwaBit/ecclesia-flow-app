/**
 * @file NotificationBell.tsx
 * @description The bell: unread count, and the latest notifications one tap away.
 *
 * - `dropdown` (desktop top bar): opens a panel with the latest few, "Mark all read" and
 *   "View all".
 * - `link` (phone header): goes straight to the inbox, because a dropdown on a phone is a
 *   worse inbox.
 *
 * It renders nothing for someone who has no notifications to show (a platform admin belongs
 * to no church; a custom role without `notifications:read` isn't allowed to read them).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { Button, Skeleton, Text } from '@/components/ui';
import {
  useMarkAllRead,
  useNotificationAccess,
  useRecentNotifications,
  useSetRead,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { badgeLabel, notificationPaths, resolveActionUrl, surfaceOf } from '@/lib/notifications';
import { cn } from '@/lib/cn';
import type { Notification } from '@/types';

const RECENT = 8;

interface NotificationBellProps {
  variant?: 'dropdown' | 'link';
  tone?: 'default' | 'platform';
}

export function NotificationBell({ variant = 'dropdown', tone = 'default' }: NotificationBellProps) {
  const access = useNotificationAccess();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const surface = surfaceOf(pathname);
  const paths = notificationPaths(surface);

  const count = useUnreadCount().data ?? 0;
  // Open belongs to the page it was opened on: moving to another page closes it, with no effect needed.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((was: boolean) => boolean)) =>
    setOpenOn((was) => ((typeof next === 'function' ? next(was === pathname) : next) ? pathname : null));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const recent = useRecentNotifications(RECENT, open && access);
  const setRead = useSetRead();
  const markAll = useMarkAllRead();

  // Close on Escape or a click away, and when the page changes underneath it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOn(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!access) return null;

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  const badge = badgeLabel(count);
  const buttonClass = cn(
    'relative grid size-11 place-items-center rounded-lg transition-colors',
    tone === 'platform' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
  );
  const icon = (
    <>
      <Bell size={19} aria-hidden />
      {badge && (
        <span
          aria-hidden
          className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none text-white"
        >
          {badge}
        </span>
      )}
    </>
  );

  if (variant === 'link') {
    return (
      <Link to={paths.inbox} aria-label={label} className={buttonClass}>
        {icon}
      </Link>
    );
  }

  function openNotification(n: Notification) {
    if (!n.isRead) setRead.mutate({ id: n.id, isRead: true });
    setOpen(false);
    navigate(resolveActionUrl(n.actionUrl, surface) ?? paths.inbox);
  }

  const items = recent.data?.items ?? [];

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
      >
        {icon}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-dropdown mt-2 w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-lg animate-fade-in dark:border-slate-700 dark:bg-surface-dark"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <Text variant="h3">Notifications</Text>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={CheckCheck}
              disabled={count === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto p-1.5" aria-live="polite">
            {recent.isLoading && (
              <div className="space-y-2 p-2" aria-label="Loading notifications">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}
            {recent.isError && (
              <div className="p-4 text-center">
                <Text variant="body-sm" color="danger" role="alert">
                  Couldn’t load your notifications.
                </Text>
                <Button variant="link" size="sm" onClick={() => recent.refetch()}>
                  Try again
                </Button>
              </div>
            )}
            {!recent.isLoading && !recent.isError && items.length === 0 && (
              <Text variant="body-sm" color="muted" className="block p-6 text-center">
                You’re all caught up.
              </Text>
            )}
            {items.length > 0 && (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem
                      notification={n}
                      surface={surface}
                      variant="compact"
                      onActivate={() => openNotification(n)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-slate-700">
            <Link
              to={paths.inbox}
              onClick={() => setOpen(false)}
              className="text-body-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
            <Link
              to={paths.preferences}
              onClick={() => setOpen(false)}
              aria-label="Notification settings"
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings size={17} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
