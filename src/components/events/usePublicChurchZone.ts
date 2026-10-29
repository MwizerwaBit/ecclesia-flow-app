/**
 * @file usePublicChurchZone.ts
 * @description The church's IANA time zone for a signed-out visitor.
 *
 * useChurchTimeZone reads the church profile, which needs a sign-in. The public
 * calendar endpoint names the zone in every response, so a one-day window is
 * enough to learn it. Falls back to the browser's zone until it answers (or when
 * the API is unavailable) so times always render.
 */
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/services/eventsService';
import { resolveZone } from '@/lib/calendar';

const DAY_MS = 24 * 60 * 60 * 1000;

export function usePublicChurchZone(slug: string): string {
  const { data } = useQuery({
    queryKey: ['public', 'church-zone', slug],
    queryFn: () => {
      const now = Date.now();
      return eventsService.publicCalendar(slug, new Date(now).toISOString(), new Date(now + DAY_MS).toISOString());
    },
    select: (window) => window.timezone,
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  return resolveZone(data);
}
