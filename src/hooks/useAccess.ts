/**
 * @file useAccess.ts
 * @description Whether the church is paid up, and what that allows right now.
 *
 * The API works this out from dates on every request and enforces it; this is
 * the same answer for the screens, so they can grey out and explain instead of
 * letting someone press a button that will be refused.
 *
 *   full       everything the plan includes
 *   basics     free modules only (new church, or a plan that just ended)
 *   view_only  nothing can be changed until the church pays
 */
import { useQuery } from '@tanstack/react-query';
import { billingService } from '@/services/billingService';
import { API_MODE } from '@/services/adapter';
import type { Access } from '@/types';

export const ACCESS_QUERY_KEY = ['billing', 'access'] as const;

export interface UseAccess {
  access: Access | null;
  /** Not paid up: some modules are locked, or everything is read-only. */
  isLapsed: boolean;
  isViewOnly: boolean;
  isLoading: boolean;
}

export function useAccess(): UseAccess {
  const { data, isLoading } = useQuery({
    queryKey: ACCESS_QUERY_KEY,
    queryFn: () => billingService.access(),
    enabled: API_MODE === 'rest',
    staleTime: 60_000,
  });
  const access = data ?? null;
  return {
    access,
    isLapsed: access?.state === 'basics' || access?.state === 'view_only',
    isViewOnly: access?.state === 'view_only',
    isLoading: API_MODE === 'rest' && isLoading,
  };
}
