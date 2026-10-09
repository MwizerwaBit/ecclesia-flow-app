/**
 * @file event.types.ts
 * @description Domain types for the Events and Attendance modules.
 */

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
  coverImageUrl: string | null;
  theme: EventTheme;
}
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
  status: EventStatus;
  unitId?: string;
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
