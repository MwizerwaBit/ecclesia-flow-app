/**
 * @file platformService.ts
 * @description Platform-admin service. Crosses tenant boundaries by design — every
 * call here is privileged and double-logged (tenant audit log plus platform log).
 */
import type {
  AuditLogEntry,
  CustomDomain,
  DomainStatus,
  DataErasureRequest,
  FeatureFlag,
  OrgListItem,
  OrgStatus,
  PlatformMetrics,
} from '@/types';
import { mockResponse, API_MODE, apiBlob, apiRequest, requireApi } from './adapter';
import type { BillingOverview, OrgDocument, OrgReviewRow, OrgTier } from '@/types';
import type { ModuleSubscription } from '@/modules/types';
import {
  MOCK_AUDIT_LOG,
  MOCK_DOMAINS,
  MOCK_ERASURE_REQUESTS,
  MOCK_FEATURE_FLAGS,
  MOCK_MRR_TREND,
  MOCK_ORGS,
  MOCK_PLATFORM_ADMINS,
  MOCK_PLATFORM_METRICS,
  MOCK_SYSTEM_HEALTH,
} from '@/mocks/platform.mock';

export interface OrgFilters {
  search?: string;
  status?: OrgStatus | 'all';
  tier?: string;
}

export const platformService = {
  async getMetrics(): Promise<PlatformMetrics> {
    if (API_MODE === 'mock') return mockResponse(MOCK_PLATFORM_METRICS);
    return apiRequest<PlatformMetrics>('/platform/metrics');
  },

  async getMrrTrend(): Promise<typeof MOCK_MRR_TREND> {
    if (API_MODE === 'mock') return mockResponse(MOCK_MRR_TREND);
    return apiRequest<typeof MOCK_MRR_TREND>('/platform/metrics/mrr');
  },

  async listOrgs(filters?: OrgFilters): Promise<OrgListItem[]> {
    if (API_MODE === 'mock') {
      let orgs = MOCK_ORGS;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        orgs = orgs.filter(
          (o) =>
            o.displayName.toLowerCase().includes(q) ||
            o.slug.includes(q) ||
            o.country.toLowerCase() === q,
        );
      }
      if (filters?.status && filters.status !== 'all') {
        orgs = orgs.filter((o) => o.status === filters.status);
      }
      if (filters?.tier && filters.tier !== 'all') {
        orgs = orgs.filter((o) => o.tier === filters.tier);
      }
      return mockResponse(orgs);
    }
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    return apiRequest<OrgListItem[]>(`/platform/orgs?${qs}`);
  },

  async getOrg(id: string): Promise<OrgListItem> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_ORGS.find((o) => o.id === id) ?? MOCK_ORGS[0]);
    }
    return apiRequest<OrgListItem>(`/platform/orgs/${id}`);
  },

  async createOrg(data: Partial<OrgListItem>): Promise<OrgListItem> {
    if (API_MODE === 'mock') {
      return mockResponse<OrgListItem>({
        ...MOCK_ORGS[0],
        ...data,
        id: `org-${Date.now()}`,
        memberCount: 0,
        createdAt: new Date().toISOString(),
      });
    }
    return apiRequest<OrgListItem>('/platform/orgs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async setOrgStatus(id: string, status: OrgStatus, reason: string): Promise<OrgListItem> {
    if (API_MODE === 'mock') {
      const org = MOCK_ORGS.find((o) => o.id === id) ?? MOCK_ORGS[0];
      return mockResponse<OrgListItem>({ ...org, status });
    }
    return apiRequest<OrgListItem>(`/platform/orgs/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },

  async listFeatureFlags(orgId: string): Promise<FeatureFlag[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_FEATURE_FLAGS);
    return apiRequest<FeatureFlag[]>(`/platform/orgs/${orgId}/feature-flags`);
  },

  async setFeatureFlag(
    orgId: string,
    code: string,
    value: boolean,
    note: string,
  ): Promise<FeatureFlag> {
    if (API_MODE === 'mock') {
      const flag = MOCK_FEATURE_FLAGS.find((f) => f.code === code) ?? MOCK_FEATURE_FLAGS[0];
      return mockResponse<FeatureFlag>({
        ...flag,
        currentValue: value,
        isOverridden: value !== flag.tierDefault,
        overrideNote: note,
        overrideSetAt: new Date().toISOString(),
      });
    }
    return apiRequest<FeatureFlag>(`/platform/orgs/${orgId}/feature-flags/${code}`, {
      method: 'PUT',
      body: JSON.stringify({ value, note }),
    });
  },

  async listAuditLog(filters?: {
    orgId?: string;
    action?: string;
  }): Promise<AuditLogEntry[]> {
    if (API_MODE === 'mock') {
      let entries = MOCK_AUDIT_LOG;
      if (filters?.orgId) entries = entries.filter((e) => e.orgId === filters.orgId);
      if (filters?.action) entries = entries.filter((e) => e.action.includes(filters.action!));
      return mockResponse(entries);
    }
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    return apiRequest<AuditLogEntry[]>(`/platform/audit-log?${qs}`);
  },

  async listDomains(): Promise<CustomDomain[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_DOMAINS);
    return apiRequest<CustomDomain[]>('/platform/domains');
  },

  async verifyDomain(id: string): Promise<CustomDomain> {
    if (API_MODE === 'mock') {
      const domain = MOCK_DOMAINS.find((d) => d.id === id) ?? MOCK_DOMAINS[0];
      return mockResponse<CustomDomain>(
        { ...domain, status: 'active', sslProvisioned: true, verifiedAt: new Date().toISOString() },
        700, // DNS checks are genuinely slow; the UI should show that honestly
      );
    }
    return apiRequest<CustomDomain>(`/platform/domains/${id}/verify`, { method: 'POST' });
  },

  async listErasureRequests(): Promise<DataErasureRequest[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_ERASURE_REQUESTS);
    return apiRequest<DataErasureRequest[]>('/platform/erasure-requests');
  },

  async decideErasureRequest(
    id: string,
    decision: 'approved' | 'rejected',
    notes?: string,
  ): Promise<DataErasureRequest> {
    if (API_MODE === 'mock') {
      const request = MOCK_ERASURE_REQUESTS.find((r) => r.id === id) ?? MOCK_ERASURE_REQUESTS[0];
      return mockResponse<DataErasureRequest>({
        ...request,
        status: decision,
        processedBy: 'Frank M.',
        notes: notes ?? request.notes,
      });
    }
    return apiRequest<DataErasureRequest>(`/platform/erasure-requests/${id}`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    });
  },

  async listPlatformAdmins(): Promise<typeof MOCK_PLATFORM_ADMINS> {
    if (API_MODE === 'mock') return mockResponse(MOCK_PLATFORM_ADMINS);
    return apiRequest<typeof MOCK_PLATFORM_ADMINS>('/platform/admins');
  },

  async getSystemHealth(): Promise<typeof MOCK_SYSTEM_HEALTH> {
    if (API_MODE === 'mock') return mockResponse(MOCK_SYSTEM_HEALTH);
    return apiRequest<typeof MOCK_SYSTEM_HEALTH>('/platform/system-health');
  },

  // ─── Actions the admin screens offer ────────────────────────────────────
  // These were buttons with no behaviour. Mock-backed like everything else
  // here, so the screens are honest about what they do and the REST calls are
  // already written for when the backend lands.

  async setSubscription(
    orgId: string,
    change: { tier?: string; cycle?: 'monthly' | 'annual'; effective?: 'immediate' | 'renewal' },
  ): Promise<OrgListItem> {
    if (API_MODE === 'mock') {
      const org = MOCK_ORGS.find((o) => o.id === orgId) ?? MOCK_ORGS[0];
      return mockResponse<OrgListItem>({ ...org, tier: (change.tier as OrgListItem['tier']) ?? org.tier });
    }
    return apiRequest<OrgListItem>(`/platform/orgs/${orgId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(change),
    });
  },

  /** Bank transfer and mobile money never touch the card processor. */
  async markInvoicePaid(orgId: string, note: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest(`/platform/orgs/${orgId}/invoices/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async generateInvoice(orgId: string): Promise<{ id: string; url: string }> {
    if (API_MODE === 'mock') {
      return mockResponse({ id: `in-${Date.now()}`, url: '#' }, 500);
    }
    return apiRequest(`/platform/orgs/${orgId}/invoices`, { method: 'POST' });
  },

  async cancelSubscription(orgId: string, reason: string): Promise<OrgListItem> {
    if (API_MODE === 'mock') {
      const org = MOCK_ORGS.find((o) => o.id === orgId) ?? MOCK_ORGS[0];
      return mockResponse<OrgListItem>({ ...org, status: 'canceled' });
    }
    return apiRequest<OrgListItem>(`/platform/orgs/${orgId}/subscription`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async revokePlatformAdmin(adminId: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest(`/platform/admins/${adminId}`, { method: 'DELETE' });
  },

  async blockIp(ip: string): Promise<void> {
    if (API_MODE === 'mock') return mockResponse(undefined as void);
    return apiRequest('/platform/rate-limits/block', {
      method: 'POST',
      body: JSON.stringify({ ip }),
    });
  },

  /** Suspending keeps the domain record so it can be reinstated without redoing DNS. */
  async setDomainStatus(domainId: string, status: DomainStatus): Promise<CustomDomain> {
    if (API_MODE === 'mock') {
      const domain = MOCK_DOMAINS.find((d) => d.id === domainId) ?? MOCK_DOMAINS[0];
      return mockResponse<CustomDomain>({ ...domain, status });
    }
    return apiRequest<CustomDomain>(`/platform/domains/${domainId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ── Registration review & lifecycle (API only) ───────────────────────

  async listOrgsForReview(filters?: { status?: string; search?: string }): Promise<OrgReviewRow[]> {
    requireApi('Organisation review');
    const qs = new URLSearchParams(
      Object.entries(filters ?? {}).filter(([, v]) => Boolean(v)) as Array<[string, string]>,
    ).toString();
    return apiRequest<OrgReviewRow[]>(`/platform/orgs${qs ? `?${qs}` : ''}`);
  },

  async activateOrg(orgId: string, note: string): Promise<OrgReviewRow> {
    requireApi('Organisation activation');
    return apiRequest<OrgReviewRow>(`/platform/orgs/${orgId}/activate`, { method: 'POST', body: JSON.stringify({ note }) });
  },

  async changeOrgStatus(orgId: string, status: 'suspended' | 'active' | 'canceled', reason: string): Promise<OrgReviewRow> {
    requireApi('Organisation status');
    return apiRequest<OrgReviewRow>(`/platform/orgs/${orgId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },

  async orgDocuments(orgId: string): Promise<OrgDocument[]> {
    requireApi('Organisation documents');
    return apiRequest<OrgDocument[]>(`/platform/orgs/${orgId}/documents`);
  },

  async downloadOrgDocument(orgId: string, documentId: string): Promise<Blob> {
    requireApi('Organisation documents');
    return apiBlob(`/platform/orgs/${orgId}/documents/${documentId}/download`);
  },

  async reviewOrgDocument(
    orgId: string,
    documentId: string,
    decision: 'verified' | 'rejected',
    note?: string,
  ): Promise<OrgDocument[]> {
    requireApi('Organisation documents');
    return apiRequest<OrgDocument[]>(`/platform/orgs/${orgId}/documents/${documentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || undefined }),
    });
  },

  async orgBilling(orgId: string): Promise<BillingOverview> {
    requireApi('Organisation billing');
    return apiRequest<BillingOverview>(`/platform/orgs/${orgId}/billing`);
  },

  async setOrgModule(orgId: string, moduleId: string, enabled: boolean | null): Promise<ModuleSubscription> {
    requireApi('Organisation modules');
    return apiRequest<ModuleSubscription>(`/platform/orgs/${orgId}/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

  async setOrgTier(orgId: string, tier: OrgTier): Promise<ModuleSubscription> {
    requireApi('Organisation plan');
    return apiRequest<ModuleSubscription>(`/platform/orgs/${orgId}/modules/tier`, {
      method: 'PUT',
      body: JSON.stringify({ tier }),
    });
  },
};
