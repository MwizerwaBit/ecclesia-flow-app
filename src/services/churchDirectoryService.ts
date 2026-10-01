/**
 * @file churchDirectoryService.ts
 * @description Unauthenticated church lookup for the public landing flow.
 *
 * Deliberately separate from platformService, which is privileged and
 * double-audit-logged — this is the opposite: no session, no tenant
 * context, callable before either exists. Only ever returns the public-safe
 * subset of an org (see PublicChurchSummary), and only orgs a visitor could
 * plausibly be looking for — a suspended or canceled church isn't operating,
 * so it isn't discoverable here even though the same row still exists for
 * platform admins.
 */
import type { PublicChurchSummary } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_ORGS } from '@/mocks/platform.mock';

const DISCOVERABLE_STATUSES = new Set(['trial', 'active']);

function toPublicSummary(org: (typeof MOCK_ORGS)[number]): PublicChurchSummary {
  return {
    slug: org.slug,
    displayName: org.displayName,
    country: org.country,
  };
}

export const churchDirectoryService = {
  async search(query?: string): Promise<PublicChurchSummary[]> {
    if (API_MODE === 'mock') {
      let orgs = MOCK_ORGS.filter((o) => DISCOVERABLE_STATUSES.has(o.status));
      if (query?.trim()) {
        const q = query.trim().toLowerCase();
        orgs = orgs.filter(
          (o) => o.displayName.toLowerCase().includes(q) || o.country.toLowerCase().includes(q),
        );
      }
      return mockResponse(orgs.map(toPublicSummary));
    }
    const qs = query ? `?${new URLSearchParams({ q: query }).toString()}` : '';
    return apiRequest<PublicChurchSummary[]>(`/public/churches${qs}`);
  },

  async getBySlug(slug: string): Promise<PublicChurchSummary | null> {
    if (API_MODE === 'mock') {
      const org = MOCK_ORGS.find((o) => o.slug === slug && DISCOVERABLE_STATUSES.has(o.status));
      return mockResponse(org ? toPublicSummary(org) : null);
    }
    return apiRequest<PublicChurchSummary | null>(`/public/churches/${slug}`);
  },
};
