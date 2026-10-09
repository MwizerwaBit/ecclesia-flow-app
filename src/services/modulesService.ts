/**
 * @file modulesService.ts
 * @description Which modules an organisation subscribes to.
 *
 * Kept separate from the org record because this is read on every navigation
 * and written rarely — and because a platform admin changes it for a church
 * without touching anything else about them.
 */
import type { OrgTier } from '@/types';
import type { ModuleId, ModuleSubscription } from '@/modules/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';

/**
 * The signed-in church's subscription. Mutable in mock mode so toggling a
 * module in settings takes effect immediately, the way it would against a real
 * backend after a refetch.
 */
let MOCK_SUBSCRIPTION: ModuleSubscription = {
  // A Seed church with one module granted above its tier, so both halves of
  // the mechanism are visible in the running app: Certificates is on by
  // negotiation, while Structure, Documents and Analytics are genuinely not
  // part of this plan.
  tier: 'seed',
  overrides: {
    certificates: true,
  },
};

export const modulesService = {
  async getSubscription(): Promise<ModuleSubscription> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SUBSCRIPTION, 80);
    return apiRequest<ModuleSubscription>('/org/modules');
  },

  /**
   * Turn a module on or off for this organisation.
   *
   * `null` clears the override and returns the module to whatever the tier
   * grants — which is different from switching it off, and the settings screen
   * distinguishes the two.
   */
  async setModule(id: ModuleId, enabled: boolean | null): Promise<ModuleSubscription> {
    if (API_MODE === 'mock') {
      const overrides = { ...MOCK_SUBSCRIPTION.overrides };
      if (enabled === null) delete overrides[id];
      else overrides[id] = enabled;
      MOCK_SUBSCRIPTION = { ...MOCK_SUBSCRIPTION, overrides };
      return mockResponse(MOCK_SUBSCRIPTION, 150);
    }
    return apiRequest<ModuleSubscription>(`/org/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  async setTier(tier: OrgTier): Promise<ModuleSubscription> {
    if (API_MODE === 'mock') {
      MOCK_SUBSCRIPTION = { ...MOCK_SUBSCRIPTION, tier };
      return mockResponse(MOCK_SUBSCRIPTION, 150);
    }
    return apiRequest<ModuleSubscription>('/org/modules/tier', {
      method: 'PUT',
      body: JSON.stringify({ tier }),
    });
  },

  /** A platform admin reading or writing another organisation's modules. */
  async getSubscriptionForOrg(orgId: string): Promise<ModuleSubscription> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SUBSCRIPTION, 80);
    return apiRequest<ModuleSubscription>(`/platform/orgs/${orgId}/modules`);
  },
};
