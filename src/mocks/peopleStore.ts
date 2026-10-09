/**
 * @file peopleStore.ts
 * @description The mock People/Groups "database", partitioned by church.
 *
 * Every other mock in this app is a read-only constant, so a create() returns
 * a record that then vanishes. People can't work like that: registering
 * someone has to put them in *that church's* directory and keep them there.
 *
 * So this is a small tenant-partitioned store. Each church's rows live under
 * their own key (`tenantId`), the same isolation the backend gets from
 * Postgres RLS: a session only ever reads and writes its own church's slice.
 * A brand-new church starts with an empty slice, not someone else's members.
 *
 * Persisted to localStorage so a reload doesn't lose what was registered. Every
 * storage access is guarded — a private window or blocked storage just means
 * the data lives for the session instead.
 */
import type { Group, GroupMembership, Household, MemberDetail } from '@/types';
import { useAuthStore } from '@/hooks/useAuthStore';
import { MOCK_HOUSEHOLDS, MOCK_MEMBERS, getMemberDetail } from './members.mock';
import { MOCK_UNITS } from './comms.mock';

export type HouseholdRecord = Omit<Household, 'members' | 'totalGiving'>;

export interface PeopleData {
  members: MemberDetail[];
  households: HouseholdRecord[];
  groups: Group[];
  memberships: GroupMembership[];
}

const STORAGE_PREFIX = 'ecclesiaflow-people:v1:';
/** The demo church every dev session belongs to; the only one with seed data. */
const DEMO_TENANT = 't1';

const cache = new Map<string, PeopleData>();

export function currentTenantId(): string {
  return useAuthStore.getState().session?.user.tenantId ?? DEMO_TENANT;
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${random}`;
}

/** This church's rows. Never returns another church's data. */
export function readPeople(tenantId = currentTenantId()): PeopleData {
  const cached = cache.get(tenantId);
  if (cached) return cached;

  let data: PeopleData | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + tenantId);
    if (raw) data = JSON.parse(raw) as PeopleData;
  } catch {
    data = null;
  }

  data ??= tenantId === DEMO_TENANT ? seed() : { members: [], households: [], groups: [], memberships: [] };
  cache.set(tenantId, data);
  return data;
}

/** Applies a change to this church's rows and persists it. */
export function writePeople(mutate: (data: PeopleData) => void, tenantId = currentTenantId()): PeopleData {
  const data = readPeople(tenantId);
  mutate(data);
  try {
    window.localStorage.setItem(STORAGE_PREFIX + tenantId, JSON.stringify(data));
  } catch {
    // Storage full or blocked — the in-memory copy still holds for this session.
  }
  return data;
}

// ─── Seed for the demo church ───────────────────────────────────────────────

const UNIT_ID_BY_NAME = new Map(MOCK_UNITS.map((u) => [u.name, u.id]));

const SEED_GROUPS: Array<Omit<Group, 'tenantId' | 'createdAt' | 'updatedAt' | 'isArchived'>> = [
  {
    id: 'g-choir',
    name: 'Sanctuary Choir',
    type: 'choir',
    description: 'Leads worship at the main Sunday service. Four-part harmony; new voices always welcome.',
    schedule: { frequency: 'weekly', day: 'thursday', time: '18:30', location: 'Church hall' },
    isOpen: true,
    capacity: 40,
    color: '#7c3aed',
  },
  {
    id: 'g-youth',
    name: 'Youth Fellowship',
    type: 'fellowship',
    description: 'Teens and young adults — Bible study, games and service projects.',
    schedule: { frequency: 'weekly', day: 'saturday', time: '16:00', location: 'Youth room' },
    isOpen: true,
    color: '#0284c7',
  },
  {
    id: 'g-media',
    name: 'Media Team',
    type: 'team',
    description: 'Sound, projection and livestream for every service.',
    unitId: 'unit-media',
    schedule: { frequency: 'weekly', day: 'sunday', time: '08:00', location: 'Sound desk' },
    isOpen: false,
    color: '#0d9488',
  },
  {
    id: 'g-women',
    name: 'Women of Grace',
    type: 'ministry',
    description: 'Monthly fellowship, prayer and outreach for the women of the church.',
    schedule: { frequency: 'monthly', day: 'saturday', time: '10:00', location: 'Fellowship hall' },
    isOpen: true,
    color: '#db2777',
  },
  {
    id: 'g-ushers',
    name: 'Ushering Department',
    type: 'department',
    description: 'Welcome, seating and the offering at every gathering.',
    schedule: { frequency: 'irregular' },
    isOpen: true,
    color: '#ea580c',
  },
  {
    id: 'g-sunday-school',
    name: 'Sunday School',
    type: 'class',
    description: 'Classes for children aged 4–12 during the main service.',
    schedule: { frequency: 'weekly', day: 'sunday', time: '09:30', location: 'Classrooms 1–3' },
    isOpen: false,
    capacity: 60,
    color: '#ca8a04',
  },
  {
    id: 'g-cell-east',
    name: 'Eastside Home Cell',
    type: 'small_group',
    description: 'Midweek prayer and Bible study in a home on the east side of town.',
    schedule: { frequency: 'weekly', day: 'tuesday', time: '19:00', location: '14 Oak Street' },
    isOpen: true,
    capacity: 12,
    color: '#16a34a',
  },
  {
    id: 'g-finance',
    name: 'Finance Committee',
    type: 'committee',
    description: 'Oversees budgets, counting procedures and the annual audit.',
    schedule: { frequency: 'monthly', day: 'wednesday', time: '19:30', location: 'Vestry' },
    isOpen: false,
    color: '#475569',
  },
];

/** [groupId, memberId, role, note?] */
const SEED_MEMBERSHIPS: Array<[string, string, GroupMembership['role'], string?]> = [
  ['g-choir', 'm10', 'leader', 'Choir director'],
  ['g-choir', 'm1', 'member', 'Tenor'],
  ['g-choir', 'm16', 'member', 'Alto'],
  ['g-choir', 'm6', 'assistant', 'Soprano · section lead'],
  ['g-youth', 'm2', 'leader'],
  ['g-youth', 'm14', 'member'],
  ['g-youth', 'm18', 'assistant'],
  ['g-media', 'm8', 'leader'],
  ['g-media', 'm11', 'member', 'Livestream'],
  ['g-women', 'm6', 'leader'],
  ['g-women', 'm16', 'member'],
  ['g-women', 'm4', 'member'],
  ['g-ushers', 'm5', 'leader'],
  ['g-ushers', 'm3', 'member'],
  ['g-ushers', 'm11', 'member'],
  ['g-sunday-school', 'm4', 'leader', 'Lead teacher'],
  ['g-sunday-school', 'm12', 'assistant'],
  ['g-sunday-school', 'm17', 'member'],
  ['g-cell-east', 'm1', 'leader', 'Hosts at home'],
  ['g-cell-east', 'm16', 'member'],
  ['g-cell-east', 'm18', 'member'],
  ['g-finance', 'm3', 'leader', 'Treasurer'],
  ['g-finance', 'm11', 'member'],
];

const SEED_HOUSEHOLD_ROLES: Partial<Record<string, MemberDetail['householdRole']>> = {
  m1: 'head',
  m16: 'spouse',
  m17: 'child',
};

function seed(): PeopleData {
  const createdAt = '2023-01-01T00:00:00Z';

  const members: MemberDetail[] = MOCK_MEMBERS.map((row) => {
    const detail = getMemberDetail(row.id);
    return {
      ...detail,
      tenantId: DEMO_TENANT,
      unitId: detail.unitId ?? (row.unitName ? UNIT_ID_BY_NAME.get(row.unitName) : undefined),
      householdId: detail.householdId ?? MOCK_HOUSEHOLDS.find((h) => h.members.some((m) => m.id === row.id))?.id,
      householdRole: SEED_HOUSEHOLD_ROLES[row.id],
      joinedAt: detail.joinedAt ?? '2022-09-04',
    };
  });

  const households: HouseholdRecord[] = MOCK_HOUSEHOLDS.map(({ members: _members, totalGiving: _total, ...h }) => ({
    ...h,
    tenantId: DEMO_TENANT,
  }));

  const groups: Group[] = SEED_GROUPS.map((g) => ({
    ...g,
    tenantId: DEMO_TENANT,
    unitName: g.unitId ? MOCK_UNITS.find((u) => u.id === g.unitId)?.name : undefined,
    isArchived: false,
    createdAt,
    updatedAt: createdAt,
  }));

  const memberships: GroupMembership[] = SEED_MEMBERSHIPS.map(([groupId, memberId, role, note], i) => ({
    id: `gm-${i + 1}`,
    tenantId: DEMO_TENANT,
    groupId,
    memberId,
    role,
    note,
    joinedAt: '2023-02-01',
  }));

  return { members, households, groups, memberships };
}
