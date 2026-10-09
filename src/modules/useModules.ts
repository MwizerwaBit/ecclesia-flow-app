/**
 * @file useModules.ts
 * @description Which modules this organisation actually has.
 *
 * Resolution order, highest priority first:
 *   1. Core modules are always on. A church cannot be sold a version of itself
 *      that does not know who its members are.
 *   2. An explicit per-org override wins over the tier — this is how a Parish
 *      church keeps a Diocese feature agreed in a negotiation, and how a module
 *      gets switched off for a church misusing it.
 *   3. Otherwise the tier decides.
 *
 * Everything that needs to know — sidebar, drawer, router, settings — reads
 * this, so there is one answer rather than four that can disagree.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { modulesService } from '@/services/modulesService';
import { MODULES } from './registry';
import { tierAtLeast, type AppModule, type ModuleId, type ModuleSubscription } from './types';

export interface ResolvedModule extends AppModule {
  enabled: boolean;
  /** Why it is on or off, for the settings screen to explain rather than assert. */
  reason: 'core' | 'tier' | 'override-on' | 'override-off' | 'tier-too-low';
}

export function resolveModules(subscription: ModuleSubscription): ResolvedModule[] {
  return MODULES.map((module) => {
    if (module.core) return { ...module, enabled: true, reason: 'core' as const };

    const override = subscription.overrides[module.id];
    if (override === true) return { ...module, enabled: true, reason: 'override-on' as const };
    if (override === false) return { ...module, enabled: false, reason: 'override-off' as const };

    const included = tierAtLeast(subscription.tier, module.minTier);
    return {
      ...module,
      enabled: included,
      reason: included ? ('tier' as const) : ('tier-too-low' as const),
    };
  });
}

interface UseModulesReturn {
  modules: ResolvedModule[];
  enabled: ResolvedModule[];
  isEnabled: (id: ModuleId) => boolean;
  subscription: ModuleSubscription;
  isLoading: boolean;
}

export function useModules(): UseModulesReturn {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['modules', 'subscription'],
    queryFn: () => modulesService.getSubscription(),
    // Module membership changes rarely and gates navigation, so a refetch
    // mid-session would make the sidebar flicker for no reason.
    staleTime: 10 * 60 * 1000,
  });

  // Until the subscription loads, assume only the core modules. Showing a
  // module the church does not have and then removing it is worse than
  // revealing one a moment late.
  const resolved = useMemo(
    () => resolveModules(subscription ?? { tier: 'free', overrides: {} }),
    [subscription],
  );

  const enabled = useMemo(() => resolved.filter((m) => m.enabled), [resolved]);
  const enabledIds = useMemo(() => new Set(enabled.map((m) => m.id)), [enabled]);

  return {
    modules: resolved,
    enabled,
    isEnabled: (id) => enabledIds.has(id),
    subscription: subscription ?? { tier: 'free', overrides: {} },
    isLoading,
  };
}
