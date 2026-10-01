/**
 * @file members.mock.ts
 * @description Realistic mock data for the People module.
 * Shaped like plausible REST responses — swap to real API by changing the service adapter.
 */
import type { MemberListItem, MemberDetail, MemberStatus, VisitorFollowUp } from '@/types';

const avatarUrls = [
  'https://i.pravatar.cc/150?img=1',
  'https://i.pravatar.cc/150?img=2',
  'https://i.pravatar.cc/150?img=3',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=6',
  'https://i.pravatar.cc/150?img=7',
  'https://i.pravatar.cc/150?img=8',
  'https://i.pravatar.cc/150?img=10',
];

function initials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

const rawMembers: Array<Omit<MemberListItem, 'initials'> & {
  firstName: string;
  lastName: string;
}> = [
  { id: 'm1', firstName: 'Aaron', lastName: 'Smith', status: 'active', unitName: 'Choir', envelopeNumber: '0042', photoUrl: avatarUrls[0], lastSeenAt: '2024-10-20' },
  { id: 'm2', firstName: 'Abigail', lastName: 'Johnson', status: 'active', unitName: 'Youth Group', envelopeNumber: '0117', photoUrl: avatarUrls[1], lastSeenAt: '2024-10-20' },
  { id: 'm3', firstName: 'Benjamin', lastName: 'Carter', status: 'active', unitName: 'Board', envelopeNumber: '0003', lastSeenAt: '2024-10-13' },
  { id: 'm4', firstName: 'Chloe', lastName: 'Davis', status: 'active', unitName: 'Sunday School', envelopeNumber: '0088', photoUrl: avatarUrls[2], lastSeenAt: '2024-10-20' },
  { id: 'm5', firstName: 'David', lastName: 'Evans', status: 'active', unitName: 'Main', envelopeNumber: '0205', photoUrl: avatarUrls[3], lastSeenAt: '2024-10-06' },
  { id: 'm6', firstName: 'Elizabeth', lastName: 'Foster', status: 'active', unitName: 'Women\'s Ministry', envelopeNumber: '0061', photoUrl: avatarUrls[4], lastSeenAt: '2024-10-20' },
  { id: 'm7', firstName: 'Franklin', lastName: 'Garcia', status: 'visitor', unitName: undefined, envelopeNumber: undefined, lastSeenAt: '2024-10-20' },
  { id: 'm8', firstName: 'Grace', lastName: 'Hill', status: 'active', unitName: 'Media Team', envelopeNumber: '0177', photoUrl: avatarUrls[5], lastSeenAt: '2024-10-20' },
  { id: 'm9', firstName: 'Henry', lastName: 'Ingram', status: 'inactive', unitName: 'Main', envelopeNumber: '0022', lastSeenAt: '2024-08-11' },
  { id: 'm10', firstName: 'Isabella', lastName: 'James', status: 'active', unitName: 'Worship Team', envelopeNumber: '0099', photoUrl: avatarUrls[6], lastSeenAt: '2024-10-13' },
  { id: 'm11', firstName: 'James', lastName: 'King', status: 'active', unitName: 'Board', envelopeNumber: '0015', lastSeenAt: '2024-10-20' },
  { id: 'm12', firstName: 'Katherine', lastName: 'Lee', status: 'active', unitName: 'Children\'s Ministry', envelopeNumber: '0144', photoUrl: avatarUrls[7], lastSeenAt: '2024-10-20' },
  { id: 'm13', firstName: 'Liam', lastName: 'Martin', status: 'visitor', unitName: undefined, lastSeenAt: '2024-10-13' },
  { id: 'm14', firstName: 'Mia', lastName: 'Nelson', status: 'active', unitName: 'Youth Group', envelopeNumber: '0233', lastSeenAt: '2024-09-29' },
  { id: 'm15', firstName: 'Noah', lastName: 'Owens', status: 'inactive', unitName: 'Main', envelopeNumber: '0068', lastSeenAt: '2024-07-14' },
];

export const MOCK_MEMBERS: MemberListItem[] = rawMembers.map(({ firstName, lastName, ...m }) => ({
  ...m,
  firstName,
  lastName,
  initials: initials(firstName, lastName),
}));

export const MOCK_MEMBER_DETAIL: MemberDetail = {
  id: 'm1',
  tenantId: 'tenant-1',
  firstName: 'Aaron',
  lastName: 'Smith',
  preferredName: 'Aaron',
  photoUrl: avatarUrls[0],
  initials: 'AS',
  email: 'aaron.smith@example.com',
  phone: '+1 555 0142',
  whatsapp: '+1 555 0142',
  status: 'active' as MemberStatus,
  envelopeNumber: '0042',
  unitId: 'unit-choir',
  unitName: 'Choir',
  joinedAt: '2019-03-15',
  lastSeenAt: '2024-10-20',
  householdId: 'hh-1',
  dateOfBirth: '1988-07-22',
  gender: 'Male',
  maritalStatus: 'Married',
  occupation: 'Software Engineer',
  address: {
    line1: '42 Maple Avenue',
    city: 'Springfield',
    state: 'IL',
    country: 'US',
    postalCode: '62701',
  },
  attendanceRate: 0.87,
  totalGiving: 14200,
  givingThisYear: 3850,
  createdAt: '2019-03-15T10:00:00Z',
  updatedAt: '2024-10-20T09:15:00Z',
};

export const MOCK_NOT_SEEN_RECENTLY: MemberListItem[] = MOCK_MEMBERS.filter(
  (m) => {
    if (!m.lastSeenAt) return false;
    const lastSeen = new Date(m.lastSeenAt);
    const weeksAgo = (Date.now() - lastSeen.getTime()) / (7 * 24 * 60 * 60 * 1000);
    return weeksAgo >= 4;
  },
);

export const MOCK_VISITOR_FOLLOWUPS: VisitorFollowUp[] = [
  {
    id: 'vf1',
    memberId: 'm7',
    member: MOCK_MEMBERS.find(m => m.id === 'm7')!,
    daysSinceVisit: 3,
    visitDate: '2024-10-17',
    status: 'pending',
    assignedToName: 'Pastor James King',
  },
  {
    id: 'vf2',
    memberId: 'm13',
    member: MOCK_MEMBERS.find(m => m.id === 'm13')!,
    daysSinceVisit: 10,
    visitDate: '2024-10-10',
    status: 'pending',
  },
];
