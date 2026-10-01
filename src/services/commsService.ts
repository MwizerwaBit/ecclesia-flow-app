/**
 * @file commsService.ts
 * @description Communications service — announcements, templates, audience sizing.
 */
import type { Announcement, AudienceFilter, HierarchyUnit, MessageTemplate } from '@/types';
import { mockResponse, API_MODE, apiRequest } from './adapter';
import { MOCK_ANNOUNCEMENTS, MOCK_TEMPLATES, MOCK_UNITS } from '@/mocks/comms.mock';
import { MOCK_MEMBERS } from '@/mocks/members.mock';

export const commsService = {
  async listAnnouncements(params?: { status?: string }): Promise<Announcement[]> {
    if (API_MODE === 'mock') {
      const items = params?.status
        ? MOCK_ANNOUNCEMENTS.filter((a) => a.status === params.status)
        : MOCK_ANNOUNCEMENTS;
      // Pinned first, then newest — matches how the list is read.
      return mockResponse(
        [...items].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
      );
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<Announcement[]>(`/announcements?${qs}`);
  },

  async getAnnouncement(id: string): Promise<Announcement> {
    if (API_MODE === 'mock') {
      return mockResponse(MOCK_ANNOUNCEMENTS.find((a) => a.id === id) ?? MOCK_ANNOUNCEMENTS[0]);
    }
    return apiRequest<Announcement>(`/announcements/${id}`);
  },

  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    if (API_MODE === 'mock') {
      return mockResponse<Announcement>({
        ...MOCK_ANNOUNCEMENTS[0],
        ...data,
        id: `an-${Date.now()}`,
        sentCount: undefined,
        deliveredCount: undefined,
        openedCount: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return apiRequest<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Live recipient count for the audience builder. Computed from the directory so
   * the number moves as filters change — an announcement nobody receives is the
   * failure mode this exists to prevent.
   */
  async estimateAudience(filter: AudienceFilter): Promise<number> {
    if (API_MODE === 'mock') {
      const matched = MOCK_MEMBERS.filter((m) => {
        const unitOk =
          !filter.unitIds?.length ||
          filter.unitIds.some((id) => MOCK_UNITS.find((u) => u.id === id)?.name === m.unitName);
        const statusOk = !filter.statuses?.length || filter.statuses.includes(m.status);
        return unitOk && statusOk;
      });
      return mockResponse(matched.length, 120);
    }
    return apiRequest<number>('/announcements/audience-estimate', {
      method: 'POST',
      body: JSON.stringify(filter),
    });
  },

  async listUnits(): Promise<HierarchyUnit[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_UNITS);
    return apiRequest<HierarchyUnit[]>('/hierarchy/units');
  },

  async listTemplates(): Promise<MessageTemplate[]> {
    if (API_MODE === 'mock') return mockResponse(MOCK_TEMPLATES);
    return apiRequest<MessageTemplate[]>('/message-templates');
  },
};
