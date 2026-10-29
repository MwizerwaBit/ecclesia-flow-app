/**
 * @file invalidate.ts
 * @description What to refresh after anything changes a gathering.
 *
 * Lists, calendars and the review queue all key on `['events', ...]`; the detail
 * screen and its attendance and history keys sit under `['event', id]`. Missing
 * either leaves a screen showing the old status.
 */
import type { QueryClient } from '@tanstack/react-query';

export function invalidateEvent(queryClient: QueryClient, eventId: string): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['events'] }),
    queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  ]);
}
