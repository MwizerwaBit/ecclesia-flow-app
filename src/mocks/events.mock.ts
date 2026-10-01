/**
 * @file events.mock.ts
 * @description Realistic mock data for Events and Attendance modules.
 */
import type { ChurchEvent, EventListItem, AttendanceSummary } from '@/types';

export const MOCK_EVENTS: EventListItem[] = [
  { id: 'ev1', title: 'Sunday Morning Service', type: 'service', startDateTime: '2024-10-27T09:00:00', location: 'Main Sanctuary', status: 'published', attendeeCount: 87, isPublic: true },
  { id: 'ev2', title: 'Young Adults Summit', type: 'event', startDateTime: '2024-10-12T09:00:00', location: 'Youth Hall', status: 'published', attendeeCount: 42, isPublic: true },
  { id: 'ev3', title: 'Choir Rehearsal', type: 'meeting', startDateTime: '2024-10-15T18:30:00', location: 'Choir Room', status: 'published', isPublic: false },
  { id: 'ev4', title: 'Vespers & Community Night', type: 'prayer', startDateTime: '2024-10-25T18:00:00', location: 'Main Sanctuary', status: 'published', isPublic: true },
  { id: 'ev5', title: 'Board Meeting', type: 'meeting', startDateTime: '2024-10-28T18:00:00', location: 'Board Room', status: 'published', isPublic: false },
  { id: 'ev6', title: 'Sunday Morning Service', type: 'service', startDateTime: '2024-10-20T09:00:00', location: 'Main Sanctuary', status: 'completed', attendeeCount: 94, isPublic: true },
];

export const MOCK_EVENT_DETAIL: ChurchEvent = {
  id: 'ev6',
  tenantId: 't1',
  title: 'Sunday Morning Service',
  type: 'service',
  description: 'Join us for our weekly Sunday morning service. All are welcome.',
  location: 'Main Sanctuary',
  startDateTime: '2024-10-20T09:00:00',
  endDateTime: '2024-10-20T11:00:00',
  isRecurring: true,
  recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU',
  status: 'completed',
  attendanceMode: 'individual',
  isPublic: true,
  createdById: 'u1',
  createdAt: '2024-09-01T00:00:00Z',
  updatedAt: '2024-10-20T11:15:00Z',
};

export const MOCK_ATTENDANCE_SUMMARY: AttendanceSummary = {
  eventId: 'ev6',
  totalExpected: 87,
  totalPresent: 79,
  attendanceRate: 0.908,
  presentMembers: [
    { id: 'm1', name: 'Aaron Smith' },
    { id: 'm2', name: 'Abigail Johnson' },
    { id: 'm4', name: 'Chloe Davis' },
    { id: 'm6', name: 'Elizabeth Foster' },
    { id: 'm8', name: 'Grace Hill' },
  ],
  absentMembers: [
    { id: 'm5', name: 'David Evans' },
    { id: 'm9', name: 'Henry Ingram' },
  ],
};

export const MOCK_PORTAL_EVENTS = MOCK_EVENTS.filter(e => e.isPublic && new Date(e.startDateTime) >= new Date());
