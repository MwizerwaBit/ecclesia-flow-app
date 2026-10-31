/**
 * @file useChurchTimeZone.ts
 * @description The church's IANA time zone: where its events sit on a day.
 *
 * Calendar responses carry the zone themselves; use this for screens that show
 * event times without having fetched a calendar window (cards, details, the form).
 * Falls back to the browser's zone while the profile loads or when the church
 * has not set one, so times always render.
 */
import { useQuery } from '@tanstack/react-query';
import { API_MODE } from '@/services/adapter';
import { orgService } from '@/services/orgService';
import { resolveZone } from '@/lib/calendar';

export function useChurchTimeZone(zoneFromWindow?: string | null): string {
  const { data } = useQuery({
    queryKey: ['org', 'profile'],
    queryFn: () => orgService.getProfile(),
    enabled: API_MODE === 'rest' && !zoneFromWindow,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return resolveZone(zoneFromWindow ?? data?.timezone);
}
