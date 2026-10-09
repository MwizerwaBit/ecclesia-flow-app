/**
 * @file comms.mock.ts
 * @description Realistic mock data for Communications, Team & Roles.
 */
import type {
  Announcement,
  CustomRole,
  HierarchyUnit,
  LeadershipTransferRequest,
  MessageTemplate,
  TeamMember,
} from '@/types';

export const MOCK_UNITS: HierarchyUnit[] = [
  { id: 'unit-main', tenantId: 't1', name: 'Main Congregation', type: 'Church', depth: 0, memberCount: 248, subUnitCount: 6, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'unit-choir', tenantId: 't1', name: 'Choir', type: 'Group', parentId: 'unit-main', parentName: 'Main Congregation', depth: 1, memberCount: 34, subUnitCount: 0, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'unit-youth', tenantId: 't1', name: 'Youth Group', type: 'Group', parentId: 'unit-main', parentName: 'Main Congregation', depth: 1, memberCount: 52, subUnitCount: 0, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'unit-women', tenantId: 't1', name: "Women's Ministry", type: 'Group', parentId: 'unit-main', parentName: 'Main Congregation', depth: 1, memberCount: 61, subUnitCount: 0, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'unit-school', tenantId: 't1', name: 'Sunday School', type: 'Group', parentId: 'unit-main', parentName: 'Main Congregation', depth: 1, memberCount: 88, subUnitCount: 0, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'unit-media', tenantId: 't1', name: 'Media Team', type: 'Group', parentId: 'unit-main', parentName: 'Main Congregation', depth: 1, memberCount: 12, subUnitCount: 0, createdAt: '2023-01-01T00:00:00Z' },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an1',
    tenantId: 't1',
    title: 'Harvest Thanksgiving — Sunday 3 November',
    body: '<p>Our annual Harvest Thanksgiving service begins at 9:00am. Please bring non-perishable goods for the benevolence pantry.</p><p>The choir will lead a special programme, and lunch follows in the hall.</p>',
    isPinned: true,
    status: 'sent',
    channels: ['email', 'in_app'],
    audienceFilter: { estimatedCount: 248 },
    sentAt: '2024-10-21T08:00:00Z',
    authorId: 'u1',
    authorName: 'Sarah Thompson',
    sentCount: 248,
    deliveredCount: 241,
    openedCount: 176,
    createdAt: '2024-10-20T16:30:00Z',
    updatedAt: '2024-10-21T08:00:00Z',
  },
  {
    id: 'an2',
    tenantId: 't1',
    title: 'Building Fund — we have passed halfway',
    body: '<p>Thanks to your faithfulness the Building Fund has passed $237,800 of our $500,000 target.</p>',
    isPinned: true,
    status: 'sent',
    channels: ['email'],
    audienceFilter: { estimatedCount: 248 },
    sentAt: '2024-10-14T09:00:00Z',
    authorId: 'u2',
    authorName: 'James King',
    sentCount: 248,
    deliveredCount: 246,
    openedCount: 198,
    createdAt: '2024-10-13T20:00:00Z',
    updatedAt: '2024-10-14T09:00:00Z',
  },
  {
    id: 'an3',
    tenantId: 't1',
    title: 'Choir rehearsal moved to Thursday',
    body: '<p>This week only, rehearsal moves to Thursday at 6:30pm in the Choir Room.</p>',
    isPinned: false,
    status: 'sent',
    channels: ['in_app'],
    audienceFilter: { unitIds: ['unit-choir'], estimatedCount: 34 },
    sentAt: '2024-10-15T12:00:00Z',
    authorId: 'u1',
    authorName: 'Sarah Thompson',
    sentCount: 34,
    deliveredCount: 34,
    openedCount: 29,
    createdAt: '2024-10-15T11:40:00Z',
    updatedAt: '2024-10-15T12:00:00Z',
  },
  {
    id: 'an4',
    tenantId: 't1',
    title: 'Volunteers needed for the Christmas outreach',
    body: '<p>We are looking for twenty volunteers to help with the December community outreach.</p>',
    isPinned: false,
    status: 'draft',
    channels: ['email', 'in_app'],
    authorId: 'u1',
    authorName: 'Sarah Thompson',
    createdAt: '2024-10-22T14:10:00Z',
    updatedAt: '2024-10-22T14:10:00Z',
  },
  {
    id: 'an5',
    tenantId: 't1',
    title: 'End of year giving statements',
    body: '<p>Contribution statements for the year will be issued in the first week of January.</p>',
    isPinned: false,
    status: 'scheduled',
    channels: ['email'],
    audienceFilter: { estimatedCount: 248 },
    scheduledAt: '2024-12-28T09:00:00Z',
    authorId: 'u2',
    authorName: 'James King',
    createdAt: '2024-10-19T10:00:00Z',
    updatedAt: '2024-10-19T10:00:00Z',
  },
];

export const MOCK_TEMPLATES: MessageTemplate[] = [
  { id: 'tpl1', tenantId: 't1', name: 'Visitor welcome', subject: 'Lovely to meet you on Sunday', body: '<p>Thank you for worshipping with us.</p>', category: 'Pastoral', isActive: true, createdAt: '2023-05-01T00:00:00Z', updatedAt: '2023-05-01T00:00:00Z' },
  { id: 'tpl2', tenantId: 't1', name: 'Absence check-in', subject: 'We have missed you', body: '<p>We noticed you have not been able to join us recently.</p>', category: 'Pastoral', isActive: true, createdAt: '2023-05-01T00:00:00Z', updatedAt: '2023-05-01T00:00:00Z' },
  { id: 'tpl3', tenantId: 't1', name: 'Pledge reminder', subject: 'Your pledge to the Building Fund', body: '<p>A gentle reminder about your pledge.</p>', category: 'Finance', isActive: true, createdAt: '2023-05-01T00:00:00Z', updatedAt: '2023-05-01T00:00:00Z' },
];

export const MOCK_TEAM: TeamMember[] = [
  { id: 'tm1', tenantId: 't1', userId: 'u1', firstName: 'Sarah', lastName: 'Thompson', email: 'sarah.thompson@example.org', photoUrl: 'https://i.pravatar.cc/150?img=5', roleId: 'role-admin', roleName: 'Church Admin', roleColor: '#4338CA', unitScope: 'all', unitScopeName: 'All units', mfaEnabled: true, lastActiveAt: '2024-10-22T08:45:00Z', invitedAt: '2023-01-10T00:00:00Z', acceptedAt: '2023-01-10T12:00:00Z', isLeader: true },
  { id: 'tm2', tenantId: 't1', userId: 'u2', firstName: 'James', lastName: 'King', email: 'james.king@example.org', roleId: 'role-pastor', roleName: 'Pastor', roleColor: '#B45309', unitScope: 'all', unitScopeName: 'All units', mfaEnabled: true, lastActiveAt: '2024-10-21T19:20:00Z', invitedAt: '2023-01-10T00:00:00Z', acceptedAt: '2023-01-11T09:00:00Z' },
  { id: 'tm3', tenantId: 't1', userId: 'u3', firstName: 'Katherine', lastName: 'Lee', email: 'katherine.lee@example.org', photoUrl: 'https://i.pravatar.cc/150?img=8', roleId: 'role-finance', roleName: 'Treasurer', roleColor: '#16A34A', unitScope: 'all', unitScopeName: 'All units', mfaEnabled: false, lastActiveAt: '2024-10-20T13:05:00Z', invitedAt: '2023-04-02T00:00:00Z', acceptedAt: '2023-04-02T15:00:00Z' },
  { id: 'tm4', tenantId: 't1', userId: 'u4', firstName: 'Grace', lastName: 'Hill', email: 'grace.hill@example.org', photoUrl: 'https://i.pravatar.cc/150?img=6', roleId: 'role-media', roleName: 'Media Lead', roleColor: '#0284C7', unitScope: 'unit-media', unitScopeName: 'Media Team', mfaEnabled: false, lastActiveAt: '2024-10-18T10:00:00Z', invitedAt: '2024-02-14T00:00:00Z', acceptedAt: '2024-02-14T18:30:00Z' },
  { id: 'tm5', tenantId: 't1', userId: 'u5', firstName: 'Noah', lastName: 'Owens', email: 'noah.owens@example.org', roleId: 'role-media', roleName: 'Media Lead', roleColor: '#0284C7', unitScope: 'unit-media', unitScopeName: 'Media Team', mfaEnabled: false, invitedAt: '2024-10-19T00:00:00Z' },
];

/**
 * The permission catalogue the custom role builder renders.
 * Mirrors the `resource:action` scoping the backend RBAC module will enforce.
 */
export const PERMISSION_CATALOGUE: Array<{
  module: string;
  description: string;
  permissions: Array<{ key: string; label: string; sensitive?: boolean }>;
}> = [
  {
    module: 'People',
    description: 'Member records, visitors and households',
    permissions: [
      { key: 'members:read', label: 'View member records' },
      { key: 'members:create', label: 'Add members and visitors' },
      { key: 'members:update', label: 'Edit member records' },
      { key: 'members:export', label: 'Export the directory', sensitive: true },
      { key: 'groups:read', label: 'View groups and their rosters' },
      { key: 'groups:manage', label: 'Create groups and manage who is in them' },
      { key: 'pastoral_notes:read', label: 'Read pastoral notes', sensitive: true },
      { key: 'pastoral_notes:write', label: 'Write pastoral notes', sensitive: true },
    ],
  },
  {
    module: 'Attendance',
    description: 'Service registers and headcounts',
    permissions: [
      { key: 'attendance:read', label: 'View attendance' },
      { key: 'attendance:create', label: 'Record attendance' },
    ],
  },
  {
    module: 'Gatherings',
    description: 'Services, meetings and events',
    permissions: [
      { key: 'events:read', label: 'View gatherings' },
      { key: 'events:create', label: 'Create gatherings' },
      { key: 'events:update', label: 'Edit gatherings' },
      { key: 'events:review', label: 'Review gatherings before they are published' },
    ],
  },
  {
    module: 'Giving',
    description: 'Offerings, funds and pledges',
    permissions: [
      { key: 'finance:read', label: 'View giving records', sensitive: true },
      { key: 'finance:create', label: 'Record giving' },
      { key: 'finance:update', label: 'Edit and void giving', sensitive: true },
      { key: 'finance:export', label: 'Export financial reports', sensitive: true },
    ],
  },
  {
    module: 'Communications',
    description: 'Announcements and message templates',
    permissions: [
      { key: 'announcements:read', label: 'View announcements' },
      { key: 'announcements:create', label: 'Publish announcements' },
    ],
  },
  {
    module: 'Administration',
    description: 'Team, roles and organisation settings',
    permissions: [
      { key: 'team:read', label: 'View the team' },
      { key: 'team:invite', label: 'Invite team members', sensitive: true },
      { key: 'roles:create', label: 'Create and edit roles', sensitive: true },
      { key: 'org:settings', label: 'Change organisation settings', sensitive: true },
      { key: 'billing:manage', label: 'Manage the subscription and payments', sensitive: true },
      { key: 'org:documents', label: 'Upload official registration documents', sensitive: true },
      { key: 'leadership:manage', label: 'Shape the leadership structure', sensitive: true },
      { key: 'admins:manage', label: 'Appoint and remove administrators', sensitive: true },
    ],
  },
];

export const MOCK_ROLES: CustomRole[] = [
  { id: 'role-admin', tenantId: 't1', name: 'Church Admin', color: '#4338CA', permissions: PERMISSION_CATALOGUE.flatMap((g) => g.permissions.map((p) => p.key)), isSystem: true, memberCount: 1, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'role-pastor', tenantId: 't1', name: 'Pastor', color: '#B45309', permissions: ['members:read', 'members:create', 'members:update', 'pastoral_notes:read', 'pastoral_notes:write', 'attendance:read', 'attendance:create', 'events:read', 'events:create', 'events:update', 'announcements:read', 'announcements:create', 'team:read'], isSystem: true, memberCount: 1, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'role-finance', tenantId: 't1', name: 'Treasurer', color: '#16A34A', permissions: ['members:read', 'finance:read', 'finance:create', 'finance:update', 'finance:export', 'events:read'], isSystem: true, memberCount: 1, createdAt: '2023-01-01T00:00:00Z' },
  { id: 'role-media', tenantId: 't1', name: 'Media Lead', color: '#0284C7', permissions: ['members:read', 'events:read', 'announcements:read', 'announcements:create'], isSystem: false, memberCount: 2, createdAt: '2024-02-01T00:00:00Z' },
];

/**
 * Mutable, in-memory leadership-transfer state. Unlike the other mock lists
 * above (which services return copies of, while components hold their own
 * optimistic state), this one is genuinely stateful across the multi-step
 * initiate → approve → approve flow, so teamService reads and writes it
 * directly — the thing a real backend's leadership_transfers table would be.
 */
export let MOCK_LEADERSHIP_TRANSFER: LeadershipTransferRequest | null = null;

export function setMockLeadershipTransfer(request: LeadershipTransferRequest | null) {
  MOCK_LEADERSHIP_TRANSFER = request;
}
