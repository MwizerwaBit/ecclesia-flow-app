/**
 * @file certificatesService.ts
 * @description Certification module service — templates, issuance, verification.
 */
import type { Certificate, CertificateTemplate } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_CERTIFICATES, MOCK_CERTIFICATE_TEMPLATES } from '@/mocks/certificates.mock';

export interface IssueCertificateInput {
  templateId: string;
  memberId: string;
  memberName: string;
  customValues: Record<string, string>;
}

/** Serial prefixes by category — human-readable and sortable by year. */
const SERIAL_PREFIX: Record<CertificateTemplate['category'], string> = {
  sacramental: 'SAC',
  membership: 'MEM',
  recognition: 'REC',
  education: 'EDU',
};

export const certificatesService = {
  async listTemplates(category?: string): Promise<CertificateTemplate[]> {
    if (API_MODE === 'mock') {
      const templates = category
        ? MOCK_CERTIFICATE_TEMPLATES.filter((t) => t.category === category)
        : MOCK_CERTIFICATE_TEMPLATES;
      return mockResponse(templates);
    }
    return apiRequest<CertificateTemplate[]>(`/certificates/templates?category=${category ?? ''}`);
  },

  async getTemplate(id: string): Promise<CertificateTemplate> {
    if (API_MODE === 'mock') {
      return mockResponse(
        MOCK_CERTIFICATE_TEMPLATES.find((t) => t.id === id) ?? MOCK_CERTIFICATE_TEMPLATES[0],
      );
    }
    return apiRequest<CertificateTemplate>(`/certificates/templates/${id}`);
  },

  async saveTemplate(template: CertificateTemplate): Promise<CertificateTemplate> {
    if (API_MODE === 'mock') {
      return mockResponse({ ...template, updatedAt: new Date().toISOString() });
    }
    return apiRequest<CertificateTemplate>(`/certificates/templates/${template.id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  },

  async listIssued(memberId?: string): Promise<Certificate[]> {
    if (API_MODE === 'mock') {
      const issued = memberId
        ? MOCK_CERTIFICATES.filter((c) => c.memberId === memberId)
        : MOCK_CERTIFICATES;
      return mockResponse(
        [...issued].sort(
          (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
        ),
      );
    }
    return apiRequest<Certificate[]>(`/certificates?memberId=${memberId ?? ''}`);
  },

  async getIssued(id: string): Promise<Certificate> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_CERTIFICATES.find((c) => c.id === id) ?? MOCK_CERTIFICATES[0]);
    }
    return apiRequest<Certificate>(`/certificates/${id}`);
  },

  async issue(input: IssueCertificateInput): Promise<Certificate> {
    if (API_MODE === 'mock') {
      const template =
        MOCK_CERTIFICATE_TEMPLATES.find((t) => t.id === input.templateId) ??
        MOCK_CERTIFICATE_TEMPLATES[0];
      const year = new Date().getFullYear();
      const sequence = String(MOCK_CERTIFICATES.length + 1).padStart(4, '0');

      return mockResponse<Certificate>({
        id: `c-${Date.now()}`,
        tenantId: 't1',
        templateId: template.id,
        templateName: template.name,
        memberId: input.memberId,
        memberName: input.memberName,
        issuedById: 'u1',
        issuedByName: 'Sarah Thompson',
        issuedAt: new Date().toISOString(),
        serialNumber: `${SERIAL_PREFIX[template.category]}-${year}-${sequence}`,
        // Stands in for the server-side hash the public /verify page resolves.
        qrHash: Math.random().toString(16).slice(2, 12),
        customValues: input.customValues,
        isRevoked: false,
      });
    }
    return apiRequest<Certificate>('/certificates/issue', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async bulkIssue(
    templateId: string,
    memberIds: string[],
    customValues: Record<string, string>,
  ): Promise<Certificate[]> {
    if (API_MODE === 'mock') {
      const template =
        MOCK_CERTIFICATE_TEMPLATES.find((t) => t.id === templateId) ??
        MOCK_CERTIFICATE_TEMPLATES[0];
      const year = new Date().getFullYear();

      return mockResponse(
        memberIds.map((memberId, i) => ({
          id: `c-${Date.now()}-${i}`,
          tenantId: 't1',
          templateId: template.id,
          templateName: template.name,
          memberId,
          memberName: '',
          issuedById: 'u1',
          issuedByName: 'Sarah Thompson',
          issuedAt: new Date().toISOString(),
          serialNumber: `${SERIAL_PREFIX[template.category]}-${year}-${String(i + 1).padStart(4, '0')}`,
          qrHash: Math.random().toString(16).slice(2, 12),
          customValues,
          isRevoked: false,
        })),
        600, // Batch generation is genuinely slower than a single issue
      );
    }
    return apiRequest<Certificate[]>('/certificates/bulk-issue', {
      method: 'POST',
      body: JSON.stringify({ templateId, memberIds, customValues }),
    });
  },

  async revoke(id: string, reason: string): Promise<Certificate> {
    if (API_MODE === 'mock') {
      const certificate = MOCK_CERTIFICATES.find((c) => c.id === id) ?? MOCK_CERTIFICATES[0];
      return mockResponse<Certificate>({
        ...certificate,
        isRevoked: true,
        revokedAt: new Date().toISOString(),
        revokedReason: reason,
      });
    }
    return apiRequest<Certificate>(`/certificates/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /** Public lookup behind the QR code — no authentication. */
  async verify(hash: string): Promise<Certificate | null> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_CERTIFICATES.find((c) => c.qrHash === hash) ?? null);
    }
    return apiRequest<Certificate | null>(`/verify/${hash}`);
  },
};
