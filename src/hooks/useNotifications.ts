/**
 * @file useNotifications.ts
 * @description React Query hooks for a person's own notifications.
 *
 * The unread count is what the bell shows, so it refreshes on its own: every minute while the
 * tab is open and whenever the tab regains focus. Everything lives under the 'notifications' key,
 * so one invalidation after a change refreshes the bell, the dropdown and the inbox together.
 * (App.tsx keeps this key out of the cache that is saved to the device.)
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { NotificationPage, NotificationPreferences, NotificationPreferencesPatch, NotificationStatusFilter } from '@/types';
import { notificationsService } from '@/services/notificationsService';
import { useCurrentRole } from '@/hooks/useAuthStore';
import { useRole } from '@/hooks/useRole';
import { ROLES } from '@/lib/constants';

export const notificationKeys = {
  all: ['notifications'] as const,
  count: ['notifications', 'unread-count'] as const,
  recent: (limit: number) => ['notifications', 'recent', limit] as const,
  feed: (status: NotificationStatusFilter) => ['notifications', 'feed', status] as const,
  preferences: ['notifications', 'preferences'] as const,
};

export const POLL_EVERY_MS = 60_000;
const FEED_PAGE_SIZE = 20;

/**
 * Whether this person has a bell at all. A platform admin belongs to no church, so has no
 * notifications; a custom role without `notifications:read` isn't allowed to read them.
 */
export function useNotificationAccess(): boolean {
  const role = useCurrentRole();
  const { can } = useRole();
  return role !== null && role !== ROLES.PLATFORM_ADMIN && can('notifications:read');
}

export function useUnreadCount() {
  const enabled = useNotificationAccess();
  return useQuery({
    queryKey: notificationKeys.count,
    queryFn: () => notificationsService.unreadCount(),
    enabled,
    staleTime: 30_000,
    refetchInterval: POLL_EVERY_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/** The latest few, for the dropdown. Only fetched while it is open. */
export function useRecentNotifications(limit: number, enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.recent(limit),
    queryFn: () => notificationsService.list({ limit }),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

/** The inbox: pages of 20, loaded as you ask for more. */
export function useNotificationFeed(status: NotificationStatusFilter) {
  const enabled = useNotificationAccess();
  return useInfiniteQuery({
    queryKey: notificationKeys.feed(status),
    queryFn: ({ pageParam }) => notificationsService.list({ status, limit: FEED_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last: NotificationPage, pages: NotificationPage[]) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** Mark one read or unread. The bell moves at once and settles with the server's answer. */
export function useSetRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) => notificationsService.setRead(id, isRead),
    meta: { inline: true },
    onMutate: ({ isRead }) => {
      queryClient.setQueryData<number>(notificationKeys.count, (n) => Math.max(0, (n ?? 0) + (isRead ? -1 : 1)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    meta: { inline: true },
    onMutate: () => {
      queryClient.setQueryData<number>(notificationKeys.count, 0);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function usePreferences() {
  const enabled = useNotificationAccess();
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => notificationsService.getPreferences(),
    enabled,
    staleTime: 60_000,
  });
}

/** Save a change. The switch flips at once; if the server refuses, it flips back. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: NotificationPreferencesPatch) => notificationsService.updatePreferences(patch),
    meta: { inline: true },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences });
      const before = queryClient.getQueryData<NotificationPreferences>(notificationKeys.preferences);
      if (before) {
        const next = structuredClone(before);
        for (const [type, channels] of Object.entries(patch)) {
          Object.assign(next.preferences[type as keyof typeof next.preferences], channels);
        }
        queryClient.setQueryData(notificationKeys.preferences, next);
      }
      return { before };
    },
    onError: (_error, _patch, context) => {
      if (context?.before) queryClient.setQueryData(notificationKeys.preferences, context.before);
    },
    onSuccess: (saved) => queryClient.setQueryData(notificationKeys.preferences, saved),
  });
}

/** Every notification loaded so far, flattened (for the inbox). */
export function flattenFeed(data: InfiniteData<NotificationPage> | undefined) {
  return data?.pages.flatMap((p) => p.items) ?? [];
}
