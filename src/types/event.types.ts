/**
 * @file event.types.ts
 * @description Domain types for the Events and Attendance modules.
 */
import type { FormAnswers, FormField, FormFieldDraft, FormFieldType, FormSubmission, FormSubmissionInput } from './forms.types';

export type EventStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'published'
  | 'canceled'
  | 'completed';
/** Who can see a published event: anyone, signed-in members, or one group. */
export type EventVisibility = 'public' | 'members' | 'private';

/** How the event looks on its page and card. */
export interface EventTheme {
  accentColor?: string | null;
  layout?: 'classic' | 'banner' | 'minimal';
}

export interface EventReview {
  reviewerUserId: string;
  reviewerName: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comment: string | null;
  decidedAt: string | null;
}

export interface ReviewerOption {
  userId: string;
  name: string;
  roleName: string;
}

export interface KeyParticipant {
  memberId: string;
  name: string;
  roleName: string;
  /** Which of the two groups in conflict they lead. */
  groupName: string;
}

export interface EventCollision {
  eventId: string;
  eventTitle: string;
  groupId: string;
  groupName: string;
  startDateTime: string;
  endDateTime: string | null;
  /** Shared group membership, not RSVPs — an approximation. */
  affectedMemberCount: number;
  /** Group leaders among the affected members. */
  keyParticipants: KeyParticipant[];
}

export interface PublicEvent {
  id: string;
  title: string;
  type: EventType;
  description: string | null;
  location: string | null;
  onlineUrl: string | null;
  startDateTime: string;
  endDateTime: string | null;
  nextOccurrence: string | null;
  isRecurring: boolean;
  /** The repeat rule, once the public API sends it; until then a repeating event just says it repeats. */
  recurrenceRule?: string | null;
  isAllDay?: boolean;
  coverImageUrl: string | null;
  theme: EventTheme;
}

/** An event's registration form is a form: same questions, same answers (see forms.types). */
export type RegistrationFieldType = FormFieldType;
export type RegistrationField = FormField;
export type RegistrationFieldDraft = FormFieldDraft;

export interface PublicEventDetail extends PublicEvent {
  registrationFields: RegistrationField[];
  /** False once the organiser has closed sign-ups. */
  registrationOpen: boolean;
}

export type RegistrationAnswers = FormAnswers;
export type EventRegistrationInput = FormSubmissionInput;
export type EventRegistration = FormSubmission;

export type AttendanceMode = 'individual' | 'headcount';
export type EventType = 'service' | 'meeting' | 'event' | 'prayer' | 'outreach' | 'other';

export interface ChurchEvent {
  id: string;
  tenantId: string;
  title: string;
  type: EventType;
  description?: string;
  location?: string;
  startDateTime: string; // ISO datetime
  endDateTime?: string;
  isRecurring: boolean;
  recurrenceRule?: string; // iCalendar RRULE
  /** Covers whole days in the church's time zone; start/end are that zone's midnights. */
  isAllDay?: boolean;
  status: EventStatus;
  unitId?: string | null;
  unitName?: string;
  attendanceMode: AttendanceMode;
  isPublic: boolean;
  visibility?: EventVisibility;
  groupId?: string | null;
  groupName?: string | null;
  coverImageUrl?: string | null;
  theme?: EventTheme;
  onlineUrl?: string | null;
  capacity?: number | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  reviews?: EventReview[];
  /** The next dozen start times for a repeating event. */
  upcomingOccurrences?: string[];
  /** The next date of a repeating event (null once the series has ended); absent on older responses. */
  nextOccurrence?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventListItem {
  id: string;
  title: string;
  type: EventType;
  startDateTime: string;
  location?: string;
  status: EventStatus;
  attendeeCount?: number;
  isPublic: boolean;
  endDateTime?: string | null;
  visibility?: EventVisibility;
  unitId?: string | null;
  groupId?: string | null;
  coverImageUrl?: string | null;
  theme?: EventTheme;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  nextOccurrence?: string | null;
  pendingReviews?: number;
  isAllDay?: boolean;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  tenantId: string;
  mode: AttendanceMode;

  // Individual mode
  memberId?: string;
  memberName?: string;

  // Headcount mode
  adultCount?: number;
  childCount?: number;
  totalCount?: number;

  markedAt: string;
  markedById: string;
}

export interface AttendanceSummary {
  eventId: string;
  totalExpected: number;
  totalPresent: number;
  attendanceRate: number; // 0-1
  presentMembers: Array<{ id: string; name: string }>;
  absentMembers: Array<{ id: string; name: string }>;
}

export interface MemberAttendanceHistory {
  memberId: string;
  totalEvents: number;
  attendedEvents: number;
  attendanceRate: number;
  streak: number; // Consecutive events attended
  records: Array<{
    eventId: string;
    eventTitle: string;
    date: string;
    attended: boolean;
  }>;
}

export interface HeadcountEntry {
  eventId: string;
  adults: number;
  children: number;
  total: number;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

/**
 * One dated appearance of an event, from GET /events/calendar. Times are UTC
 * instants; place them on a day with the church's time zone (`CalendarWindow.timezone`).
 * `eventId` + `occurrenceStart` identify it (a repeating event has many).
 */
export interface CalendarOccurrence {
  eventId: string;
  title: string;
  type: EventType;
  status: EventStatus;
  visibility: EventVisibility;
  unitId: string | null;
  groupId: string | null;
  groupName: string | null;
  location: string | null;
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  accentColor: string | null;
}

export interface CalendarWindow {
  /** The church's IANA time zone, e.g. "Africa/Kigali". */
  timezone: string;
  windowStart: string;
  windowEnd: string;
  /** More dates exist than were returned: narrow the window or the filters. */
  truncated: boolean;
  occurrences: CalendarOccurrence[];
}

/** What the public calendar shows: no status, group, unit or visibility. */
export interface PublicCalendarOccurrence {
  eventId: string;
  title: string;
  type: EventType;
  location: string | null;
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  accentColor: string | null;
}

export interface PublicCalendarWindow {
  timezone: string;
  windowStart: string;
  windowEnd: string;
  truncated: boolean;
  occurrences: PublicCalendarOccurrence[];
}

export interface CalendarFilters {
  type?: EventType;
  groupId?: string;
  unitId?: string;
  /** Staff only; members never see non-published events whatever they ask for. */
  status?: EventStatus;
}

/** One line of an event's history, from GET /events/{id}/history. */
export interface EventHistoryEntry {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string;
  metadata: {
    changed?: Record<string, { from: unknown; to: unknown }>;
    comment?: string | null;
    reviewers?: string[];
    title?: string;
    via?: string;
    [key: string]: unknown;
  } | null;
}

/**
 * What every calendar component needs from an occurrence. Staff, member and
 * public windows all satisfy it (the public one has no status/visibility/group),
 * so one month grid and one agenda serve all three screens.
 */
export interface CalendarItem {
  eventId: string;
  title: string;
  type: EventType;
  location: string | null;
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  accentColor: string | null;
  /** Absent on the public calendar, where every item is published. */
  status?: EventStatus;
  visibility?: EventVisibility;
  groupName?: string | null;
}
