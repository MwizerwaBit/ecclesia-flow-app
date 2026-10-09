/**
 * @file orgService.ts
 * @description The signed-in church's own record: profile, onboarding
 * checklist, the people in charge, and official documents.
 */
import type {
  OnboardingStatus,
  OrgDocument,
  OrgProfile,
  OrgProfileUpdate,
  PersonInChargeInvite,
  TeamMember,
} from '@/types';
import { apiBlob, apiRequest, requireApi } from './adapter';

export const orgService = {
  async getProfile(): Promise<OrgProfile> {
    requireApi('Church profile');
    return apiRequest<OrgProfile>('/org/profile');
  },

  async updateProfile(data: OrgProfileUpdate): Promise<OrgProfile> {
    requireApi('Church profile');
    return apiRequest<OrgProfile>('/org/profile', { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getOnboarding(): Promise<OnboardingStatus> {
    requireApi('Onboarding');
    return apiRequest<OnboardingStatus>('/org/onboarding');
  },

  /** Invite the church leader (while there is none) or, as the leader, an administrator. */
  async invitePersonInCharge(payload: PersonInChargeInvite): Promise<TeamMember> {
    requireApi('Inviting leaders');
    return apiRequest<TeamMember>('/org/people-in-charge', { method: 'POST', body: JSON.stringify(payload) });
  },

  async listDocuments(): Promise<OrgDocument[]> {
    requireApi('Official documents');
    return apiRequest<OrgDocument[]>('/org/documents');
  },

  /** PDF, PNG or JPEG up to 10 MB; the server checks the bytes, not the extension. */
  async uploadCertificate(file: File): Promise<OrgDocument> {
    requireApi('Certificate upload');
    const body = new FormData();
    body.append('file', file);
    return apiRequest<OrgDocument>('/org/documents/certificate', { method: 'POST', body, rawBody: true });
  },

  async downloadDocument(id: string): Promise<Blob> {
    requireApi('Document download');
    return apiBlob(`/org/documents/${id}/download`);
  },
};
