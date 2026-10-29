/**
 * @file eventsService.ts
 * @description Events and Attendance service interface.
 *
 * Mirrors membersService: every call is mock-backed today and swaps to REST
 * by flipping API_MODE in adapter.ts — screens never change.
 */
import type {
  AttendanceMode,
  AttendanceRecord,
  AttendanceSummary,
  CalendarFilters,
  CalendarOccurrence,
  CalendarWindow,
  ChurchEvent,
  EventCollision,
  EventHistoryEntry,
  EventListItem,
  EventTheme,
  EventType,
  EventVisibility,
  PublicCalendarWindow,
  EventRegistration,
  EventRegistrationInput,
  HeadcountEntry,
  PublicEvent,
  PublicEventDetail,
  RegistrationField,
  RegistrationFieldDraft,
  ReviewerOption,
} from '@/types';
import { mockResponse, API_MODE, apiRequest, apiRequestAll, requireApi } from './adapter';
import { MOCK_EVENTS, MOCK_EVENT_DETAIL, MOCK_ATTENDANCE_SUMMARY } from '@/mocks/events.mock';

export interface AttendanceMarkInput {
  eventId: string;
  memberId: string;
  memberName: string;
}

/**
 * What the API accepts when creating or editing a gathering. Status and
 * public/private are deliberately absent: a gathering starts as a draft and
 * moves through submit / review / publish / cancel, and who may see it is its
 * `visibility`.
 *
 * Times: a value with no UTC offset ("2026-03-01T09:00", what a date-time input
 * gives) is the church's local time; the server places it in the church's zone.
 */
export interface EventWrite {
  title: string;
  type: EventType;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  recurrenceRule: string;
  unitId: string | null;
  groupId: string | null;
  visibility: EventVisibility;
  attendanceMode: AttendanceMode;
  onlineUrl: string | null;
  capacity: number | null;
  coverImageUrl: string | null;
  theme: EventTheme;
  /** The `updatedAt` the editor was looking at; a newer save elsewhere answers 409 `edit_conflict`. */
  expectedUpdatedAt: string;
}

function calendarQuery(from: string, to: string, filters: CalendarFilters = {}): string {
  const params = new URLSearchParams({ from, to });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params.toString();
}

/** The mock dataset as calendar dates, so the screens work without the API. */
function mockCalendar(from: string, to: string, filters: CalendarFilters = {}): CalendarWindow {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const occurrences: CalendarOccurrence[] = MOCK_EVENTS.filter((e) => {
    const at = new Date(e.startDateTime).getTime();
    return at >= start && at <= end && (!filters.type || e.type === filters.type);
  }).map((e) => ({
    eventId: e.id,
    title: e.title,
    type: e.type,
    status: e.status,
    visibility: e.isPublic ? 'public' : 'members',
    unitId: null,
    groupId: null,
    groupName: null,
    location: e.location ?? null,
    occurrenceStart: new Date(e.startDateTime).toISOString(),
    occurrenceEnd: e.endDateTime ? new Date(e.endDateTime).toISOString() : null,
    isAllDay: false,
    isRecurring: false,
    accentColor: null,
  }));
  return { timezone: 'UTC', windowStart: from, windowEnd: to, truncated: false, occurrences };
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
    // Every page: the API caps a page at 500 rows and a church can have more.
    return apiRequestAll<EventListItem>(`/events?${qs}`);
  },

  /**
   * Dated appearances of events between `from` and `to` (at most 93 days), repeating
   * events already expanded in the church's time zone. Staff see every status in
   * their scope; members only what a member may see.
   */
  async calendar(from: string, to: string, filters: CalendarFilters = {}): Promise<CalendarWindow> {
    if (API_MODE === 'mock') return mockResponse(mockCalendar(from, to, filters));
    return apiRequest<CalendarWindow>(`/events/calendar?${calendarQuery(from, to, filters)}`);
  },

  /** A church's published public gatherings in a window — no sign-in. */
  async publicCalendar(slug: string, from: string, to: string): Promise<PublicCalendarWindow> {
    requireApi('Public events');
    return apiRequest<PublicCalendarWindow>(
      `/churches/${encodeURIComponent(slug)}/calendar?${calendarQuery(from, to)}`,
      { skipAuth: true },
    );
  },

  /** Who created, changed, submitted, approved, published or canceled a gathering. */
  async history(eventId: string): Promise<EventHistoryEntry[]> {
    requireApi('Event history');
    return apiRequest<EventHistoryEntry[]>(`/events/${eventId}/history`);
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

  async create(data: Partial<EventWrite>): Promise<ChurchEvent> {
    if (API_MODE === 'mock') {
      return mockResponse<ChurchEvent>({ ...MOCK_EVENT_DETAIL, ...data, id: `ev-${Date.now()}` });
    }
    return apiRequest<ChurchEvent>('/events', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id: string, data: Partial<EventWrite>): Promise<ChurchEvent> {
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
    // A list endpoint: a daily series over a year is more than one page.
    return apiRequestAll<string>(
      `/events/${eventId}/occurrences?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  },

  /** A church's published public gatherings — no sign-in. */
  async publicEvents(slug: string): Promise<PublicEvent[]> {
    requireApi('Public events');
    return apiRequest<PublicEvent[]>(`/churches/${encodeURIComponent(slug)}/events`, { skipAuth: true });
  },

  /** One public gathering, with its registration questions — the share link. */
  async publicEventDetail(slug: string, eventId: string): Promise<PublicEventDetail> {
    requireApi('Public events');
    return apiRequest<PublicEventDetail>(
      `/churches/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}`,
      { skipAuth: true },
    );
  },

  /** Anonymous RSVP through the public share link — no sign-in needed. */
  async register(slug: string, eventId: string, input: EventRegistrationInput): Promise<EventRegistration> {
    requireApi('Event registration');
    return apiRequest<EventRegistration>(
      `/churches/${encodeURIComponent(slug)}/events/${encodeURIComponent(eventId)}/register`,
      { method: 'POST', body: JSON.stringify(input), skipAuth: true },
    );
  },

  // ── Registration forms (API only) ───────────────────────────────────────

  async getRegistrationFields(eventId: string): Promise<RegistrationField[]> {
    requireApi('Registration forms');
    return apiRequest<RegistrationField[]>(`/events/${eventId}/fields`);
  },

  /** Replaces the whole form, in the order given. */
  async setRegistrationFields(eventId: string, fields: RegistrationFieldDraft[]): Promise<RegistrationField[]> {
    requireApi('Registration forms');
    return apiRequest<RegistrationField[]>(`/events/${eventId}/fields`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });
  },

  async listResponses(eventId: string): Promise<EventRegistration[]> {
    requireApi('Registration forms');
    return apiRequest<EventRegistration[]>(`/events/${eventId}/responses?limit=500`);
  },

  // ── Schedule collisions (API only) ──────────────────────────────────────

  /** Other groups' gatherings this one would overlap, before it's even saved. */
  async checkCollisions(input: {
    groupId: string;
    startDateTime: string;
    endDateTime?: string;
    excludeEventId?: string;
  }): Promise<EventCollision[]> {
    requireApi('Schedule collisions');
    return apiRequest<EventCollision[]>('/events/collisions', { method: 'POST', body: JSON.stringify(input) });
  },

  /** Asks each named leader which of the two clashing gatherings they'll be
   * at. Returns how many were actually reached (some have no portal login). */
  async notifyConflict(eventId: string, collidingEventId: string, memberIds: string[]): Promise<number> {
    requireApi('Schedule collisions');
    return apiRequest<number>('/events/notify-conflict', {
      method: 'POST',
      body: JSON.stringify({ eventId, collidingEventId, memberIds }),
    });
  },
};
