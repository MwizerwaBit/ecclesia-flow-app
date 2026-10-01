/**
 * @file constants.ts
 * @description App-wide constants — never scatter magic strings in components.
 */

// ─── App meta ─────────────────────────────────────────────────────────────────
export const APP_NAME = 'EcclesiaFlow';
export const APP_VERSION = '1.0.0';

// ─── Route paths ──────────────────────────────────────────────────────────────
export const ROUTES = {
  // Public / Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  MAGIC_LINK_SENT: '/magic-link-sent',
  MFA_SETUP: '/mfa/setup',
  MFA_CHALLENGE: '/mfa/challenge',
  VERIFICATION_WAITING: '/verify-email',
  ACCOUNT_LOCKED: '/account-locked',
  SESSION_EXPIRED: '/session-expired',
  SUBSCRIPTION_EXPIRED: '/subscription-expired',
  OFFLINE: '/offline',
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',

  // Onboarding
  ONBOARDING_ORG_1: '/onboarding/org/1',
  ONBOARDING_ORG_2: '/onboarding/org/2',
  ONBOARDING_BRANDING: '/onboarding/branding',
  ONBOARDING_HIERARCHY: '/onboarding/hierarchy',
  ONBOARDING_FIRST_MEMBER: '/onboarding/first-member',
  ONBOARDING_FIRST_EVENT: '/onboarding/first-event',
  ONBOARDING_COMPLETE: '/onboarding/complete',

  // Member portal
  PORTAL_HOME: '/portal',
  PORTAL_PROFILE: '/portal/profile',
  PORTAL_GIVING: '/portal/giving',
  PORTAL_EVENTS: '/portal/events',
  PORTAL_ANNOUNCEMENTS: '/portal/announcements',
  PORTAL_NOTIFICATIONS: '/portal/notifications',
  PORTAL_NOTIFICATION_PREFS: '/portal/notifications/preferences',

  // Staff — Members
  MEMBERS_LIST: '/staff/members',
  MEMBER_PROFILE: '/staff/members/:id',
  MEMBER_ADD: '/staff/members/add',
  MEMBER_EDIT: '/staff/members/:id/edit',
  MEMBER_SEARCH: '/staff/members/search',
  HOUSEHOLD: '/staff/households/:id',
  NOT_SEEN_RECENTLY: '/staff/members/not-seen',
  VISITOR_FOLLOWUP: '/staff/members/visitor-followup',

  // Staff — Attendance
  TAKE_ATTENDANCE: '/staff/attendance/take',
  HEADCOUNT_ENTRY: '/staff/attendance/headcount',
  ATTENDANCE_REPORT: '/staff/attendance/report',

  // Staff — Events
  EVENTS_LIST: '/staff/events',
  EVENT_CREATE: '/staff/events/new',
  EVENT_DETAIL: '/staff/events/:id',
  EVENT_EDIT: '/staff/events/:id/edit',

  // Staff — Finance
  FINANCE_DASHBOARD: '/staff/finance',
  DONATION_BATCHES: '/staff/finance/batches',
  BATCH_NEW: '/staff/finance/batches/new',
  BATCH_DETAIL: '/staff/finance/batches/:id',
  DONATION_ENTRY: '/staff/finance/batches/:batchId/donations/new',
  FUND_MANAGEMENT: '/staff/finance/funds',
  PLEDGE_MANAGEMENT: '/staff/finance/pledges',
  GIVING_REPORTS: '/staff/finance/reports',
  CONTRIBUTION_STATEMENTS: '/staff/finance/statements',

  // Staff — Certificates
  CERTIFICATE_TEMPLATES: '/staff/certificates',
  TEMPLATE_DESIGNER: '/staff/certificates/templates/:id/design',
  ISSUE_CERTIFICATE: '/staff/certificates/issue',
  BULK_ISSUE: '/staff/certificates/bulk-issue',

  // Staff — Communications
  ANNOUNCEMENTS_LIST: '/staff/comms/announcements',
  ANNOUNCEMENT_CREATE: '/staff/comms/announcements/new',
  MESSAGE_TEMPLATES: '/staff/comms/templates',

  // Staff — Main dashboard
  MAIN_DASHBOARD: '/staff/dashboard',

  // Board / Network admin
  BOARD_DASHBOARD: '/board/dashboard',
  HIERARCHY_TREE: '/board/hierarchy',
  HIERARCHY_SETTINGS: '/board/hierarchy/settings',
  UNIT_DETAIL: '/board/units/:id',
  ORGANISATIONS_LIST: '/board/organisations',
  ORGANISATION_DETAIL: '/board/organisations/:id',
  ORGANISATION_SETTINGS: '/board/organisations/:id/settings',
  PARISH_COMPARISON: '/board/reports/parish-comparison',
  DOMAIN_MANAGEMENT: '/board/domains',
  WHITE_LABEL_SETTINGS: '/board/white-label',

  // Team & Roles
  TEAM_ROLES: '/staff/team',
  TEAM_MEMBERS: '/staff/team/members',
  INVITE_STAFF: '/staff/team/invite',
  CUSTOM_ROLE_BUILDER: '/staff/team/roles/new',
  SECURITY_SETTINGS: '/staff/settings/security',

  // Analytics
  ANALYTICS_DASHBOARD: '/staff/analytics',

  // Platform admin
  PLATFORM_LOGIN: '/platform/login',
  PLATFORM_DASHBOARD: '/platform/dashboard',
  PLATFORM_ORGS: '/platform/orgs',
  PLATFORM_ORG_DETAIL: '/platform/orgs/:id',
  PLATFORM_FEATURE_FLAGS: '/platform/orgs/:id/flags',
  PLATFORM_IMPERSONATION: '/platform/impersonate',
  PLATFORM_ANNOUNCEMENTS: '/platform/announcements',
  PLATFORM_AUDIT_LOG: '/platform/audit-log',
  PLATFORM_METRICS: '/platform/metrics',
  PLATFORM_SYSTEM_HEALTH: '/platform/system-health',
  PLATFORM_BILLING: '/platform/billing',
  PLATFORM_DATA_ERASURE: '/platform/data-erasure',
  PLATFORM_DATA_PRIVACY: '/platform/data-privacy',
  PLATFORM_API_INTEGRATIONS: '/platform/api-integrations',
  PLATFORM_DOCS: '/platform/documents',
} as const;

// ─── Role identifiers ─────────────────────────────────────────────────────────
export const ROLES = {
  MEMBER: 'member',
  STAFF: 'staff',
  BOARD: 'board',
  PLATFORM_ADMIN: 'platform_admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ─── Membership statuses ──────────────────────────────────────────────────────
export const MEMBER_STATUS = {
  ACTIVE: 'active',
  VISITOR: 'visitor',
  INACTIVE: 'inactive',
  PROSPECT: 'prospect',
} as const;

// ─── Finance ──────────────────────────────────────────────────────────────────
export const BATCH_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  POSTED: 'posted',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'cash',
  CHECK: 'check',
  CARD: 'card',
  TRANSFER: 'transfer',
  MOBILE_MONEY: 'mobile_money',
} as const;

// ─── Org subscription tiers ───────────────────────────────────────────────────
export const TIERS = {
  FREE: 'free',
  SEED: 'seed',
  PARISH: 'parish',
  GROWTH: 'growth',
  DIOCESE: 'diocese',
  ENTERPRISE: 'enterprise',
} as const;

export const ORG_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELED: 'canceled',
} as const;

// ─── Notification channels ────────────────────────────────────────────────────
export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  PUSH: 'push',
  IN_APP: 'in_app',
  SMS: 'sms',
} as const;

// ─── Attendance modes ─────────────────────────────────────────────────────────
export const ATTENDANCE_MODE = {
  INDIVIDUAL: 'individual',
  HEADCOUNT: 'headcount',
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 25;
