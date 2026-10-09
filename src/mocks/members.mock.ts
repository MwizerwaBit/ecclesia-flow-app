/**
 * @file members.mock.ts
 * @description Realistic mock data for the People module.
 * Shaped like plausible REST responses — swap to real API by changing the service adapter.
 */
import type { Household, MemberListItem, MemberDetail, MemberStatus, VisitorFollowUp } from '@/types';

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
  { id: 'm1', firstName: 'Aaron', lastName: 'Smith', status: 'active', unitName: 'Choir', envelopeNumber: '0042', photoUrl: avatarUrls[0], lastSeenAt: '2024-10-20' , email: 'aaron.smith@example.com', phone: '+1 555 0101' },
  { id: 'm2', firstName: 'Abigail', lastName: 'Johnson', status: 'active', unitName: 'Youth Group', envelopeNumber: '0117', photoUrl: avatarUrls[1], lastSeenAt: '2024-10-20' , email: 'abigail.johnson@example.com', phone: '+1 555 0102' },
  { id: 'm3', firstName: 'Benjamin', lastName: 'Carter', status: 'active', unitName: 'Board', envelopeNumber: '0003', lastSeenAt: '2024-10-13' , email: 'benjamin.carter@example.com', phone: '+1 555 0103' },
  { id: 'm4', firstName: 'Chloe', lastName: 'Davis', status: 'active', unitName: 'Sunday School', envelopeNumber: '0088', photoUrl: avatarUrls[2], lastSeenAt: '2024-10-20' , email: 'chloe.davis@example.com', phone: '+1 555 0104' },
  { id: 'm5', firstName: 'David', lastName: 'Evans', status: 'active', unitName: 'Main', envelopeNumber: '0205', photoUrl: avatarUrls[3], lastSeenAt: '2024-10-06' , email: 'david.evans@example.com', phone: '+1 555 0105' },
  { id: 'm6', firstName: 'Elizabeth', lastName: 'Foster', status: 'active', unitName: 'Women\'s Ministry', envelopeNumber: '0061', photoUrl: avatarUrls[4], lastSeenAt: '2024-10-20' , email: 'elizabeth.foster@example.com', phone: '+1 555 0106' },
  { id: 'm7', firstName: 'Franklin', lastName: 'Garcia', status: 'visitor', unitName: undefined, envelopeNumber: undefined, lastSeenAt: '2024-10-20' , email: 'franklin.garcia@example.com', phone: '+1 555 0107' },
  { id: 'm8', firstName: 'Grace', lastName: 'Hill', status: 'active', unitName: 'Media Team', envelopeNumber: '0177', photoUrl: avatarUrls[5], lastSeenAt: '2024-10-20' , email: 'grace.hill@example.com', phone: '+1 555 0108' },
  { id: 'm9', firstName: 'Henry', lastName: 'Ingram', status: 'inactive', unitName: 'Main', envelopeNumber: '0022', lastSeenAt: '2024-08-11' , email: 'henry.ingram@example.com', phone: '+1 555 0109' },
  { id: 'm10', firstName: 'Isabella', lastName: 'James', status: 'active', unitName: 'Worship Team', envelopeNumber: '0099', photoUrl: avatarUrls[6], lastSeenAt: '2024-10-13' , email: 'isabella.james@example.com', phone: '+1 555 0110' },
  { id: 'm11', firstName: 'James', lastName: 'King', status: 'active', unitName: 'Board', envelopeNumber: '0015', lastSeenAt: '2024-10-20' , email: 'james.king@example.com', phone: '+1 555 0111' },
  { id: 'm12', firstName: 'Katherine', lastName: 'Lee', status: 'active', unitName: 'Children\'s Ministry', envelopeNumber: '0144', photoUrl: avatarUrls[7], lastSeenAt: '2024-10-20' , email: 'katherine.lee@example.com', phone: '+1 555 0112' },
  { id: 'm13', firstName: 'Liam', lastName: 'Martin', status: 'visitor', unitName: undefined, lastSeenAt: '2024-10-13' , email: 'liam.martin@example.com', phone: '+1 555 0113' },
  { id: 'm14', firstName: 'Mia', lastName: 'Nelson', status: 'active', unitName: 'Youth Group', envelopeNumber: '0233', lastSeenAt: '2024-09-29' , email: 'mia.nelson@example.com', phone: '+1 555 0114' },
  { id: 'm15', firstName: 'Noah', lastName: 'Owens', status: 'inactive', unitName: 'Main', envelopeNumber: '0068', lastSeenAt: '2024-07-14' , email: 'noah.owens@example.com', phone: '+1 555 0115' },
  // Aaron Smith's household (hh-1, see MOCK_HOUSEHOLDS) — the only household fully on file today.
  { id: 'm16', firstName: 'Emma', lastName: 'Smith', status: 'active', unitName: "Women's Ministry", envelopeNumber: '0043', lastSeenAt: '2024-10-20' , email: 'emma.smith@example.com', phone: '+1 555 0116' },
  { id: 'm17', firstName: 'Lucas', lastName: 'Smith', status: 'active', unitName: 'Sunday School', lastSeenAt: '2024-10-20' , email: 'lucas.smith@example.com', phone: '+1 555 0117' },
  // Julian Brooks (m18) is the one member with a portal login — see
  // MOCK_PORTAL_MEMBER_DETAIL below, which is what links the "member" dev
  // session to a real giving history instead of placeholder numbers.
  { id: 'm18', firstName: 'Julian', lastName: 'Brooks', status: 'active', unitName: 'Young Adults', envelopeNumber: '0210', lastSeenAt: '2024-10-27' , email: 'julian.brooks@example.com', phone: '+1 555 0118' },
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
  gender: 'male',
  maritalStatus: 'married',
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

/**
 * The one member with a portal login (userId set) — what MyProfile/MyGiving/
 * PortalHome resolve "my own record" against via getMemberDetailByUserId,
 * instead of showing placeholder numbers with no member behind them.
 */
export const MOCK_PORTAL_MEMBER_DETAIL: MemberDetail = {
  id: 'm18',
  tenantId: 'tenant-1',
  userId: 'u-member',
  firstName: 'Julian',
  lastName: 'Brooks',
  photoUrl: avatarUrls[1],
  initials: 'JB',
  email: 'julian@stjudes.org',
  phone: '+1 555 0198',
  status: 'active' as MemberStatus,
  envelopeNumber: '0210',
  unitId: 'unit-youth',
  unitName: 'Young Adults',
  joinedAt: '2023-01-15',
  lastSeenAt: '2024-10-27',
  address: {
    line1: '123 Grace Way, Suite 4',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    postalCode: '78701',
  },
  attendanceRate: 0.74,
  totalGiving: 850,
  givingThisYear: 375,
  createdAt: '2023-01-15T00:00:00Z',
  updatedAt: '2024-10-20T09:15:00Z',
};

const FULLY_DETAILED: MemberDetail[] = [MOCK_MEMBER_DETAIL, MOCK_PORTAL_MEMBER_DETAIL];

/**
 * Builds a MemberDetail for any roster id. Only Aaron Smith (m1) and Julian
 * Brooks (m18, the portal demo login) have fully fleshed-out profiles today —
 * everyone else gets their real identity/contact/status fields plus empty
 * extended fields, rather than fabricated biographical data. Mirrors what a
 * real system looks like mid-migration: some profiles are complete, most are
 * not yet.
 */
export function getMemberDetail(id: string): MemberDetail {
  const detailed = FULLY_DETAILED.find((m) => m.id === id);
  if (detailed) return detailed;
  const roster = MOCK_MEMBERS.find((m) => m.id === id);
  if (!roster) return MOCK_MEMBER_DETAIL;
  return {
    ...roster,
    tenantId: MOCK_MEMBER_DETAIL.tenantId,
    createdAt: MOCK_MEMBER_DETAIL.createdAt,
    updatedAt: MOCK_MEMBER_DETAIL.updatedAt,
  };
}

/** Resolves the member record linked to a portal login, or undefined if that account isn't tied to one yet. */
export function getMemberDetailByUserId(userId: string): MemberDetail | undefined {
  return FULLY_DETAILED.find((m) => m.userId === userId);
}

export const MOCK_HOUSEHOLDS: Household[] = [
  {
    id: 'hh-1',
    tenantId: 'tenant-1',
    name: 'The Smith Household',
    headMemberId: 'm1',
    address: MOCK_MEMBER_DETAIL.address,
    members: MOCK_MEMBERS.filter((m) => ['m1', 'm16', 'm17'].includes(m.id)),
    totalGiving: 6150,
    createdAt: '2019-03-15T10:00:00Z',
  },
];

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
