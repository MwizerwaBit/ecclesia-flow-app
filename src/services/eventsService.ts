/**
 * @file eventsService.ts
 * @description Events and Attendance service interface.
 *
 * Mirrors membersService: every call is mock-backed today and swaps to REST
 * by flipping API_MODE in adapter.ts — screens never change.
 */
import type {
  AttendanceRecord,
  AttendanceSummary,
  ChurchEvent,
  EventListItem,
  HeadcountEntry,
  PublicEvent,
  ReviewerOption,
} from '@/types';
import { mockResponse, API_MODE, apiRequest, requireApi } from './adapter';
import { MOCK_EVENTS, MOCK_EVENT_DETAIL, MOCK_ATTENDANCE_SUMMARY } from '@/mocks/events.mock';

export interface AttendanceMarkInput {
  eventId: string;
  memberId: string;
  memberName: string;
}

export const eventsService = {
  async list(params?: { search?: string; upcoming?: boolean }): Promise<EventListItem[]> {
    if (API_MODE === 'mock') {
      let events = MOCK_EVENTS;
      if (params?.search) {
        const q = params.search.toLowerCase();
        events = events.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.location ?? '').toLowerCase().includes(q),
        );
      }
      if (params?.upcoming !== undefined) {
        // The mock dataset is fixed in time, so "upcoming" is relative to the
        // newest event in it rather than to today — keeps both tabs populated.
        const pivot = Math.max(...MOCK_EVENTS.map((e) => new Date(e.startDateTime).getTime()));
        events = events.filter((e) =>
          params.upcoming
            ? new Date(e.startDateTime).getTime() >= pivot - 7 * 24 * 60 * 60 * 1000
            : new Date(e.startDateTime).getTime() < pivot - 7 * 24 * 60 * 60 * 1000,
        );
      }
      return mockResponse(
        [...events].sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
        ),
      );
    }
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<EventListItem[]>(`/events?${qs}`);
  },

  async getById(id: string): Promise<ChurchEvent> {
    if (API_MODE === 'mock') {
      const listed = MOCK_EVENTS.find((e) => e.id === id);
      return mockResponse<ChurchEvent>({
        ...MOCK_EVENT_DETAIL,
        id,
        ...(listed
          ? {
              title: listed.title,
              type: listed.type,
              location: listed.location,
              startDateTime: listed.startDateTime,
              status: listed.status,
              isPublic: listed.isPublic,
            }
          : {}),
      });
    }
    return apiRequest<ChurchEvent>(`/events/${id}`);
  },

  async create(data: Partial<ChurchEvent>): Promise<ChurchEvent> {
    if (API_MODE === 'mock') {
      return mockResponse<ChurchEvent>({ ...MOCK_EVENT_DETAIL, ...data, id: `ev-${Date.now()}` });
    }
    return apiRequest<ChurchEvent>('/events', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id: string, data: Partial<ChurchEvent>): Promise<ChurchEvent> {
    if (API_MODE === 'mock') {
      return mockResponse<ChurchEvent>({ ...MOCK_EVENT_DETAIL, ...data, id });
    }
    return apiRequest<ChurchEvent>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getAttendanceSummary(eventId: string): Promise<AttendanceSummary> {
    if (API_MODE === 'mock') return mockResponse({ ...MOCK_ATTENDANCE_SUMMARY, eventId });
    return apiRequest<AttendanceSummary>(`/events/${eventId}/attendance`);
  },

  /**
   * Record one member as present. Called once per tap on Take Attendance, so it
   * stays deliberately small — the screen keeps its own optimistic state.
   */
  async markPresent(input: AttendanceMarkInput): Promise<AttendanceRecord> {
    if (API_MODE === 'mock') {
      return mockResponse<AttendanceRecord>(
        {
          id: `att-${input.memberId}-${Date.now()}`,
          eventId: input.eventId,
          tenantId: 't1',
          mode: 'individual',
          memberId: input.memberId,
          memberName: input.memberName,
          markedAt: new Date().toISOString(),
          markedById: 'u1',
        },
        80, // Deliberately snappy — Sunday morning has no patience for spinners
      );
    }
    return apiRequest<AttendanceRecord>(`/events/${input.eventId}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ memberId: input.memberId, mode: 'individual' }),
    });
  },

  async unmarkPresent(eventId: string, memberId: string): Promise<void> {
    if (API_MODE === 'mock') {
      await mockResponse(null, 80);
      return;
    }
    await apiRequest<void>(`/events/${eventId}/attendance/${memberId}`, { method: 'DELETE' });
  },

  async submitHeadcount(entry: HeadcountEntry): Promise<AttendanceRecord> {
    if (API_MODE === 'mock') {
      return mockResponse<AttendanceRecord>({
        id: `att-hc-${Date.now()}`,
        eventId: entry.eventId,
        tenantId: 't1',
        mode: 'headcount',
        adultCount: entry.adults,
        childCount: entry.children,
        totalCount: entry.total,
        markedAt: new Date().toISOString(),
        markedById: 'u1',
      });
    }
    return apiRequest<AttendanceRecord>(`/events/${entry.eventId}/attendance/headcount`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  // ── Review workflow (API only) ────────────────────────────────────────

  /** Team members who may review — never includes you. */
  async reviewerOptions(): Promise<ReviewerOption[]> {
    requireApi('Event review');
    return apiRequest<ReviewerOption[]>('/events/reviewer-options');
  },

  async submitForReview(eventId: string, reviewerUserIds: string[]): Promise<ChurchEvent> {
    requireApi('Event review');
    return apiRequest<ChurchEvent>(`/events/${eventId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ reviewerUserIds }),
    });
  },

  async review(eventId: string, decision: 'approved' | 'changes_requested', comment?: string): Promise<ChurchEvent> {
    requireApi('Event review');
    return apiRequest<ChurchEvent>(`/events/${eventId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: comment || undefined }),
    });
  },

  /** For reviewers: publish without a separate review. */
  async publish(eventId: string): Promise<ChurchEvent> {
    requireApi('Publishing');
    return apiRequest<ChurchEvent>(`/events/${eventId}/publish`, { method: 'POST' });
  },

  async cancel(eventId: string): Promise<ChurchEvent> {
    requireApi('Canceling');
    return apiRequest<ChurchEvent>(`/events/${eventId}/cancel`, { method: 'POST' });
  },

  /** Gatherings waiting for my decision. */
  async reviewQueue(): Promise<EventListItem[]> {
    requireApi('Event review');
    return apiRequest<EventListItem[]>('/events/review-queue');
  },

  async occurrences(eventId: string, from: string, to: string): Promise<string[]> {
    requireApi('Repeating events');
    return apiRequest<string[]>(
      `/events/${eventId}/occurrences?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  },

  /** A church's published public gatherings — no sign-in. */
  async publicEvents(slug: string): Promise<PublicEvent[]> {
    requireApi('Public events');
    return apiRequest<PublicEvent[]>(`/churches/${encodeURIComponent(slug)}/events`, { skipAuth: true });
  },
};
