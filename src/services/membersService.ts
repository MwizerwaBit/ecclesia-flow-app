/**
 * @file membersService.ts
 * @description Members / People service interface.
 */
import type { Household, MemberListItem, MemberDetail, PastoralNote, SacramentalRecord, VisitorFollowUp, VisitorQuickAdd } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_MEMBERS, MOCK_HOUSEHOLDS, MOCK_NOT_SEEN_RECENTLY, MOCK_VISITOR_FOLLOWUPS, getMemberDetail, getMemberDetailByUserId } from '@/mocks/members.mock';

export const membersService = {
  async list(params?: { search?: string; status?: string; unitId?: string }): Promise<MemberListItem[]> {
    if (API_MODE === 'mock') {
      let members = MOCK_MEMBERS;
      if (params?.search) {
        const q = params.search.toLowerCase();
        members = members.filter(m =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
          m.envelopeNumber?.includes(q)
        );
      }
      if (params?.status) {
        members = members.filter(m => m.status === params.status);
      }
      return mockResponse(members);
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<MemberListItem[]>(`/members?${qs}`);
  },

  async getById(id: string): Promise<MemberDetail> {
    if (API_MODE === 'mock') return mockResponse(getMemberDetail(id));
    return apiRequest<MemberDetail>(`/members/${id}`);
  },

  /** The member record behind a portal login, if that account is linked to one yet. */
  async getByUserId(userId: string): Promise<MemberDetail | null> {
    if (API_MODE === 'mock') return mockResponse(getMemberDetailByUserId(userId) ?? null);
    return apiRequest<MemberDetail | null>(`/members?userId=${userId}`);
  },

  async create(data: Partial<MemberDetail>): Promise<MemberDetail> {
    if (API_MODE === 'mock') {
      return mockResponse({
        tenantId: 'tenant-1',
        initials: `${(data.firstName ?? '?')[0]}${(data.lastName ?? '?')[0]}`.toUpperCase(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
        id: `m-${Date.now()}`,
      } as MemberDetail);
    }
    return apiRequest<MemberDetail>('/members', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id: string, data: Partial<MemberDetail>): Promise<MemberDetail> {
    if (API_MODE === 'mock') {
      return mockResponse({ ...getMemberDetail(id), ...data, id, updatedAt: new Date().toISOString() });
    }
    return apiRequest<MemberDetail>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getPastoralNotes(memberId: string): Promise<PastoralNote[]> {
    if (API_MODE === 'mock') {
      // Only m1 has a note on file today — everyone else genuinely has none yet.
      if (memberId !== 'm1') return mockResponse<PastoralNote[]>([]);
      return mockResponse<PastoralNote[]>([
        { id: 'pn1', memberId, content: '<p>Aaron mentioned he\'s going through a difficult time at work. Follow up next week.</p>', authorId: 'u-staff', authorName: 'Pastor Sarah Thompson', isPrivate: true, createdAt: '2024-10-15T10:00:00Z', updatedAt: '2024-10-15T10:00:00Z' },
      ]);
    }
    return apiRequest<PastoralNote[]>(`/members/${memberId}/pastoral-notes`);
  },

  async getSacramentalRecords(memberId: string): Promise<SacramentalRecord[]> {
    if (API_MODE === 'mock') {
      // Only m1 has sacramental history on file today — everyone else genuinely has none yet.
      if (memberId !== 'm1') return mockResponse<SacramentalRecord[]>([]);
      return mockResponse<SacramentalRecord[]>([
        { id: 'sr1', memberId, type: 'Baptism', date: '1990-06-15', officiantName: 'Rev. David Morrison', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
        { id: 'sr2', memberId, type: 'Confirmation', date: '2002-04-20', officiantName: 'Bishop Thomas Eliot', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
      ]);
    }
    return apiRequest<SacramentalRecord[]>(`/members/${memberId}/sacramental-records`);
  },

  async getHousehold(householdId: string): Promise<Household | null> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_HOUSEHOLDS.find((h) => h.id === householdId) ?? null);
    }
    return apiRequest<Household | null>(`/households/${householdId}`);
  },

  async getNotSeenRecently(): Promise<MemberListItem[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_NOT_SEEN_RECENTLY);
    return apiRequest<MemberListItem[]>('/members/not-seen-recently');
  },

  async getVisitorFollowUps(): Promise<VisitorFollowUp[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_VISITOR_FOLLOWUPS);
    return apiRequest<VisitorFollowUp[]>('/members/visitor-followups');
  },

  async quickAddVisitor(data: VisitorQuickAdd): Promise<MemberListItem> {
    if (API_MODE === 'mock') return mockResponse<MemberListItem>({
      id: `m-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
      status: 'visitor',
    });
    return apiRequest<MemberListItem>('/members/visitor-quick-add', { method: 'POST', body: JSON.stringify(data) });
  },
};
