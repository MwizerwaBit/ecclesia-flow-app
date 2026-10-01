/**
 * @file event.types.ts
 * @description Domain types for the Events and Attendance modules.
 */

export type EventStatus = 'draft' | 'published' | 'canceled' | 'completed';
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
