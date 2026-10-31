/**
 * @file NotificationsInbox.tsx
 * @description The full list of a person's notifications: grouped by day, All / Unread, loaded
 * a page at a time, with the details one tap away. One screen for the member portal, the staff
 * area and the board area; only the links differ (see lib/notifications).
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck, Settings } from 'lucide-react';
import type { Notification, NotificationStatusFilter } from '@/types';
import { NotificationItem } from './NotificationItem';
import { Button, Card, EmptyState, FilterChips, Skeleton, Text } from '@/components/ui';
import {
  flattenFeed,
  useMarkAllRead,
  useNotificationAccess,
  useNotificationFeed,
  useSetRead,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { groupByDay, notificationPaths, resolveActionUrl, surfaceOf } from '@/lib/notifications';

const FILTERS: Array<{ value: NotificationStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

export function NotificationsInbox() {
  const access = useNotificationAccess();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const surface = surfaceOf(pathname);
  const paths = notificationPaths(surface);

  const [filter, setFilter] = useState<NotificationStatusFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const feed = useNotificationFeed(filter);
  const unread = useUnreadCount().data ?? 0;
  const setRead = useSetRead();
  const markAll = useMarkAllRead();

  const items = flattenFeed(feed.data);
  const groups = groupByDay(items);

  function toggle(n: Notification) {
    const opening = openId !== n.id;
    setOpenId(opening ? n.id : null);
    // Opening one is reading it.
    if (opening && !n.isRead) setRead.mutate({ id: n.id, isRead: true });
  }

  function open(n: Notification) {
    const to = resolveActionUrl(n.actionUrl, surface);
    if (to) navigate(to);
  }

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in px-4 py-6 pb-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <Text variant="h1">Notifications</Text>
          <Text variant="body" color="muted" aria-live="polite">
            {!access ? '' : unread > 0 ? `${unread} unread` : 'You’re all caught up'}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={CheckCheck}
            disabled={!access || unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
          <Link
            to={paths.preferences}
            aria-label="Notification settings"
            className="grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings size={19} aria-hidden />
          </Link>
        </div>
      </header>

      {!access ? (
        <EmptyState
          icon={BellOff}
          title="Notifications aren’t available for your role"
          description="Ask a church leader if you think you should be getting them."
        />
      ) : (
        <>
          <FilterChips label="Filter notifications" value={filter} onChange={setFilter} options={FILTERS} className="mb-4" />

          {feed.isLoading && (
            <div className="space-y-3" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {feed.isError && (
            <Card padding="md" accent="danger" role="alert">
              <Text variant="body" className="mb-2">
                Your notifications couldn’t be loaded.
              </Text>
              <Button variant="secondary" size="sm" onClick={() => feed.refetch()}>
                Try again
              </Button>
            </Card>
          )}

          {setRead.isError && (
            <Text variant="caption" color="danger" role="alert" className="mb-3 block">
              That change couldn’t be saved. It will correct itself on the next refresh.
            </Text>
          )}

          {!feed.isLoading && !feed.isError && items.length === 0 && (
            <EmptyState
              icon={BellOff}
              title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'Everything has been read.'
                  : 'When something needs your attention — a gathering, a reminder, a message from your church — it will appear here.'
              }
            />
          )}

          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <Text variant="label" color="muted" className="mb-2 block">
                  {group.label}
                </Text>
                <ul className="space-y-2">
                  {group.items.map((n) => (
                    <li key={n.id}>
                      <NotificationItem
                        notification={n}
                        surface={surface}
                        variant="card"
                        expanded={openId === n.id}
                        onActivate={() => toggle(n)}
                        onToggleRead={() => setRead.mutate({ id: n.id, isRead: !n.isRead })}
                        onOpenLink={() => open(n)}
                        busy={setRead.isPending && setRead.variables?.id === n.id}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {feed.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" isLoading={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
                Load older notifications
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
