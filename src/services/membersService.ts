/**
 * @file membersService.ts
 * @description Members / People service interface.
 */
import type { MemberListItem, MemberDetail, PastoralNote, SacramentalRecord, VisitorFollowUp, VisitorQuickAdd } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_MEMBERS, MOCK_MEMBER_DETAIL, MOCK_NOT_SEEN_RECENTLY, MOCK_VISITOR_FOLLOWUPS } from '@/mocks/members.mock';

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
    if (API_MODE === 'mock') return mockResponse(MOCK_MEMBER_DETAIL);
    return apiRequest<MemberDetail>(`/members/${id}`);
  },

  async create(data: Partial<MemberDetail>): Promise<MemberDetail> {
    if (API_MODE === 'mock') return mockResponse({ ...MOCK_MEMBER_DETAIL, ...data, id: `m-${Date.now()}` });
    return apiRequest<MemberDetail>('/members', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id: string, data: Partial<MemberDetail>): Promise<MemberDetail> {
    if (API_MODE === 'mock') return mockResponse({ ...MOCK_MEMBER_DETAIL, ...data });
    return apiRequest<MemberDetail>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  async getPastoralNotes(memberId: string): Promise<PastoralNote[]> {
    if (API_MODE === 'mock') return mockResponse<PastoralNote[]>([
      { id: 'pn1', memberId, content: '<p>Aaron mentioned he\'s going through a difficult time at work. Follow up next week.</p>', authorId: 'u-staff', authorName: 'Pastor Sarah Thompson', isPrivate: true, createdAt: '2024-10-15T10:00:00Z', updatedAt: '2024-10-15T10:00:00Z' },
    ]);
    return apiRequest<PastoralNote[]>(`/members/${memberId}/pastoral-notes`);
  },

  async getSacramentalRecords(memberId: string): Promise<SacramentalRecord[]> {
    if (API_MODE === 'mock') return mockResponse<SacramentalRecord[]>([
      { id: 'sr1', memberId, type: 'Baptism', date: '1990-06-15', officiantName: 'Rev. David Morrison', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
      { id: 'sr2', memberId, type: 'Confirmation', date: '2002-04-20', officiantName: 'Bishop Thomas Eliot', location: "St. Jude's Cathedral", createdAt: '2019-03-15T00:00:00Z' },
    ]);
    return apiRequest<SacramentalRecord[]>(`/members/${memberId}/sacramental-records`);
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
