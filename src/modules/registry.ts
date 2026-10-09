/**
 * @file registry.ts
 * @description Every module the product ships, in one list.
 *
 * ── Adding a module ───────────────────────────────────────────────────────
 * 1. Add its id to `ModuleId` in types.ts.
 * 2. Append an entry here with its nav and routes.
 * 3. There is no step three. The sidebar, the mobile drawer, the router, the
 *    tier gating and the platform admin's per-org toggles all read this list,
 *    so none of them needs editing.
 *
 * Paths are relative to the surface root (/staff), which keeps a module from
 * caring where it is mounted.
 */
import {
  Award,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  HeartHandshake,
  Megaphone,
  Network,
  Settings,
  Target,
  UserMinus,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { AppModule } from './types';

export const MODULES: AppModule[] = [
  {
    id: 'people',
    name: 'People',
    description: 'Members, visitors, households, groups and the pastoral follow-up lists.',
    icon: Users,
    core: true,
    minTier: 'free',
    nav: [
      { label: 'Directory', path: 'members', icon: Users, section: 'People', permission: 'members:read' },
      { label: 'Groups', path: 'groups', icon: UsersRound, section: 'People', permission: 'groups:read' },
      { label: 'Follow-ups', path: 'members/visitor-followup', icon: HeartHandshake, section: 'People', permission: 'members:read' },
      { label: 'Not seen recently', path: 'members/not-seen', icon: UserMinus, section: 'People', permission: 'members:read' },
    ],
    routes: [
      { path: 'members', index: true, permission: 'members:read', component: 'MembersList', load: () => import('@/routes/staff/MembersList') },
      { path: 'members/add', permission: 'members:create', component: 'MemberForm', load: () => import('@/routes/staff/people/MemberForm') },
      { path: 'members/:id/edit', permission: 'members:update', component: 'MemberForm', load: () => import('@/routes/staff/people/MemberForm') },
      { path: 'members/not-seen', permission: 'members:read', component: 'NotSeenRecently', load: () => import('@/routes/staff/people/NotSeenRecently') },
      { path: 'members/visitor-followup', permission: 'members:read', component: 'VisitorFollowUp', load: () => import('@/routes/staff/people/VisitorFollowUp') },
      { path: 'members/export', permission: 'members:export', component: 'MemberCsvExport', load: () => import('@/routes/staff/people/MemberCsvExport') },
      { path: 'members/:id', permission: 'members:read', component: 'MemberProfileStaff', load: () => import('@/routes/staff/MemberProfileStaff') },
      { path: 'households/:id', permission: 'members:read', component: 'HouseholdView', load: () => import('@/routes/staff/people/HouseholdView') },
      { path: 'groups', permission: 'groups:read', component: 'GroupsList', load: () => import('@/routes/staff/groups/GroupsList') },
      { path: 'groups/new', permission: 'groups:manage', component: 'GroupForm', load: () => import('@/routes/staff/groups/GroupForm') },
      { path: 'groups/:id', permission: 'groups:read', component: 'GroupDetail', load: () => import('@/routes/staff/groups/GroupDetail') },
      { path: 'groups/:id/edit', permission: 'groups:manage', component: 'GroupForm', load: () => import('@/routes/staff/groups/GroupForm') },
      { path: 'groups/roles', permission: 'groups:read', component: 'GroupRoles', load: () => import('@/routes/staff/groups/GroupRoles') },
    ],
  },

  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Service registers, headcounts and the absence reports they feed.',
    icon: CalendarCheck,
    core: true,
    minTier: 'free',
    nav: [
      { label: 'Take attendance', path: 'attendance/take', icon: CalendarCheck, section: 'Gatherings', permission: 'attendance:create' },
      { label: 'Attendance report', path: 'attendance/report', icon: BarChart3, section: 'Gatherings', permission: 'attendance:read' },
    ],
    routes: [
      { path: 'attendance/take', index: true, permission: 'attendance:create', component: 'TakeAttendance', load: () => import('@/routes/staff/TakeAttendance') },
      { path: 'attendance/headcount', permission: 'attendance:create', component: 'HeadcountEntry', load: () => import('@/routes/staff/HeadcountEntry') },
      { path: 'attendance/report', permission: 'attendance:read', component: 'AttendanceReport', load: () => import('@/routes/staff/AttendanceReport') },
    ],
  },

  {
    id: 'gatherings',
    name: 'Gatherings',
    description: 'Services, meetings and events, with recurrence.',
    icon: CalendarDays,
    core: true,
    minTier: 'free',
    nav: [
      { label: 'Events', path: 'events', icon: CalendarDays, section: 'Gatherings', permission: 'events:read' },
      { label: 'Reviews', path: 'events/reviews', icon: ClipboardCheck, section: 'Gatherings', permission: 'events:review' },
    ],
    routes: [
      { path: 'events', index: true, permission: 'events:read', component: 'EventsList', load: () => import('@/routes/staff/EventsList') },
      { path: 'events/new', permission: 'events:create', component: 'CreateEditEvent', load: () => import('@/routes/staff/CreateEditEvent') },
      { path: 'events/:id', permission: 'events:read', component: 'EventDetail', load: () => import('@/routes/staff/EventDetail') },
      { path: 'events/:id/edit', permission: 'events:update', component: 'CreateEditEvent', load: () => import('@/routes/staff/CreateEditEvent') },
      { path: 'events/reviews', permission: 'events:review', component: 'ReviewQueue', load: () => import('@/routes/staff/events/ReviewQueue') },
    ],
  },

  {
    id: 'giving',
    name: 'Giving',
    description: 'Offerings, funds, pledges, statements and the reconciliation flow.',
    icon: Banknote,
    minTier: 'seed',
    nav: [
      { label: 'Overview', path: 'finance', icon: Banknote, section: 'Giving', permission: 'finance:read' },
      { label: 'Offering batches', path: 'finance/batches', icon: Wallet, section: 'Giving', permission: 'finance:create' },
      { label: 'Funds', path: 'finance/funds', icon: Banknote, section: 'Giving', permission: 'finance:read' },
      { label: 'Pledges', path: 'finance/pledges', icon: Target, section: 'Giving', permission: 'finance:read' },
      { label: 'Reports', path: 'finance/reports', icon: BarChart3, section: 'Giving', permission: 'finance:read' },
      { label: 'Statements', path: 'finance/statements', icon: FolderOpen, section: 'Giving', permission: 'finance:read' },
    ],
    routes: [
      { path: 'finance', index: true, permission: 'finance:read', component: 'FinanceDashboard', load: () => import('@/routes/staff/finance/FinanceDashboard') },
      { path: 'finance/batches', permission: 'finance:create', component: 'DonationBatches', load: () => import('@/routes/staff/finance/DonationBatches') },
      { path: 'finance/batches/:batchId/donations/new', permission: 'finance:create', component: 'DonationEntry', load: () => import('@/routes/staff/finance/DonationEntry') },
      { path: 'finance/batches/:batchId/review', permission: 'finance:create', component: 'BatchReviewClose', load: () => import('@/routes/staff/finance/BatchReviewClose') },
      { path: 'finance/batches/:batchId/void', permission: 'finance:update', component: 'DonationVoid', load: () => import('@/routes/staff/finance/DonationVoid') },
      { path: 'finance/funds', permission: 'finance:read', component: 'FundManagement', load: () => import('@/routes/staff/finance/FundManagement') },
      { path: 'finance/pledges', permission: 'finance:read', component: 'PledgeManagement', load: () => import('@/routes/staff/finance/PledgeManagement') },
      { path: 'finance/reports', permission: 'finance:read', component: 'GivingReports', load: () => import('@/routes/staff/finance/GivingReports') },
      { path: 'finance/statements', permission: 'finance:read', component: 'ContributionStatements', load: () => import('@/routes/staff/finance/ContributionStatements') },
      { path: 'finance/statements/preview', permission: 'finance:read', component: 'StatementPreview', load: () => import('@/routes/staff/finance/StatementPreview') },
    ],
  },

  {
    id: 'communications',
    name: 'Communications',
    description: 'Announcements to the congregation, by email and in the portal.',
    icon: Megaphone,
    minTier: 'seed',
    nav: [{ label: 'Announcements', path: 'comms/announcements', icon: Megaphone, section: 'Operations', permission: 'announcements:read' }],
    routes: [
      { path: 'comms/announcements', index: true, permission: 'announcements:read', component: 'AnnouncementsList', load: () => import('@/routes/staff/comms/AnnouncementsList') },
      { path: 'comms/announcements/new', permission: 'announcements:create', component: 'CreateAnnouncement', load: () => import('@/routes/staff/comms/CreateAnnouncement') },
      { path: 'comms/announcements/:id', permission: 'announcements:read', component: 'AnnouncementDetail', load: () => import('@/routes/staff/comms/AnnouncementDetail') },
    ],
  },

  {
    id: 'certificates',
    name: 'Certificates',
    description: 'Issue and verify sacramental, membership and recognition certificates.',
    icon: Award,
    minTier: 'parish',
    nav: [{ label: 'Certificates', path: 'certificates', icon: Award, section: 'Operations', permission: 'certificates:read' }],
    routes: [
      { path: 'certificates', index: true, permission: 'certificates:read', component: 'CertificateTemplates', load: () => import('@/routes/staff/certificates/CertificateTemplates') },
      { path: 'certificates/issue', permission: 'certificates:create', component: 'IssueCertificate', load: () => import('@/routes/staff/certificates/IssueCertificate') },
      { path: 'certificates/bulk-issue', permission: 'certificates:create', component: 'BulkIssue', load: () => import('@/routes/staff/certificates/BulkIssue') },
      { path: 'certificates/issued/:id', permission: 'certificates:read', component: 'IssuedCertificateDetail', load: () => import('@/routes/staff/certificates/IssuedCertificateDetail') },
      { path: 'certificates/templates/:id/design', permission: 'certificates:create', component: 'TemplateDesigner', load: () => import('@/routes/staff/certificates/TemplateDesigner') },
    ],
  },

  {
    id: 'hierarchy',
    name: 'Structure',
    description: 'Branches, zones and groups, at any depth.',
    icon: Network,
    minTier: 'parish',
    nav: [{ label: 'Structure', path: 'hierarchy', icon: Network, section: 'Operations', permission: 'hierarchy:read' }],
    routes: [
      { path: 'hierarchy', index: true, permission: 'hierarchy:read', component: 'HierarchyTreeView', load: () => import('@/routes/staff/hierarchy/HierarchyTreeView') },
      { path: 'hierarchy/units/:id', permission: 'hierarchy:read', component: 'UnitDetail', load: () => import('@/routes/staff/hierarchy/UnitDetail') },
    ],
  },

  {
    id: 'media',
    name: 'Documents',
    description: 'Files, photos and generated exports held for the organisation.',
    icon: FolderOpen,
    minTier: 'parish',
    nav: [{ label: 'Documents', path: 'documents', icon: FolderOpen, section: 'Operations' }],
    routes: [
      { path: 'documents', index: true, component: 'DocumentLibrary', load: () => import('@/routes/staff/DocumentLibrary') },
    ],
  },

  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Attendance, giving and growth trends with visitor conversion.',
    icon: BarChart3,
    minTier: 'growth',
    nav: [{ label: 'Analytics', path: 'analytics', icon: BarChart3, section: 'Operations', permission: 'analytics:read' }],
    routes: [
      { path: 'analytics', index: true, permission: 'analytics:read', component: 'AnalyticsDashboard', load: () => import('@/routes/staff/AnalyticsDashboard') },
    ],
  },

  {
    id: 'administration',
    name: 'Administration',
    description: 'Team, roles, organisation settings, billing and data controls.',
    icon: Settings,
    core: true,
    minTier: 'free',
    nav: [
      { label: 'Team & roles', path: 'team', icon: Users, section: 'Administration', permission: 'team:read' },
      { label: 'Leadership', path: 'team/structure', icon: Network, section: 'Administration', permission: 'team:read' },
      { label: 'Settings', path: 'settings', icon: Settings, section: 'Administration' },
    ],
    routes: [
      { path: 'team', index: true, permission: 'team:read', component: 'TeamAndRoles', load: () => import('@/routes/staff/team/TeamAndRoles') },
      { path: 'team/invite', permission: 'team:invite', component: 'InviteStaff', load: () => import('@/routes/staff/team/InviteStaff') },
      { path: 'team/roles/new', permission: 'roles:create', component: 'CustomRoleBuilder', load: () => import('@/routes/staff/team/CustomRoleBuilder') },
      { path: 'team/structure', permission: 'team:read', component: 'LeadershipStructure', load: () => import('@/routes/staff/team/LeadershipStructure') },
      { path: 'settings', component: 'OrganisationSettings', load: () => import('@/routes/staff/settings/OrganisationSettings') },
      { path: 'settings/security', component: 'SecuritySettings', load: () => import('@/routes/staff/settings/SecuritySettings') },
      { path: 'settings/notifications', component: 'NotificationPreferences', load: () => import('@/routes/staff/settings/NotificationPreferences') },
      { path: 'settings/billing', permission: 'org:settings', component: 'SubscriptionBilling', load: () => import('@/routes/staff/settings/SubscriptionBilling') },
      { path: 'settings/data', permission: 'org:settings', component: 'DataPrivacy', load: () => import('@/routes/staff/settings/DataPrivacy') },
      { path: 'settings/integrations', permission: 'org:settings', component: 'ApiIntegrations', load: () => import('@/routes/staff/settings/ApiIntegrations') },
      { path: 'settings/modules', permission: 'org:settings', component: 'ModuleSettings', load: () => import('@/routes/staff/settings/ModuleSettings') },
    ],
  },
];

/** Order the sidebar presents sections in; anything unlisted falls to the end. */
export const SECTION_ORDER = ['People', 'Gatherings', 'Giving', 'Operations', 'Administration'];

export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
