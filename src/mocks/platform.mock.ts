/**
 * @file platform.mock.ts
 * @description Mock data for the platform-admin surface (EcclesiaFlow staff only).
 *
 * Deliberately messier than the tenant mocks: a real platform has trials about to
 * lapse, a suspended account, and an org that has not signed in for months. Those
 * are the rows the platform screens exist to surface.
 */
import type {
  AuditLogEntry,
  CustomDomain,
  DataErasureRequest,
  FeatureFlag,
  OrgListItem,
  PlatformMetrics,
} from '@/types';

export const MOCK_ORGS: OrgListItem[] = [
  { id: 'org-1', displayName: "St. Jude's Parish", slug: 'st-judes', country: 'US', tier: 'parish', status: 'active', memberCount: 248, createdAt: '2023-01-10T00:00:00Z', renewalDate: '2025-01-10', lastActiveAt: '2024-10-22T08:45:00Z' },
  { id: 'org-2', displayName: 'Grace Chapel Nairobi', slug: 'grace-nairobi', country: 'KE', tier: 'growth', status: 'active', memberCount: 1120, createdAt: '2023-06-02T00:00:00Z', renewalDate: '2025-06-02', lastActiveAt: '2024-10-22T05:12:00Z' },
  { id: 'org-3', displayName: 'Lagos Diocese', slug: 'lagos-diocese', country: 'NG', tier: 'diocese', status: 'active', memberCount: 8430, createdAt: '2022-11-15T00:00:00Z', renewalDate: '2024-11-15', lastActiveAt: '2024-10-21T17:30:00Z' },
  { id: 'org-4', displayName: 'Riverside Fellowship', slug: 'riverside', country: 'GB', tier: 'seed', status: 'trial', memberCount: 38, createdAt: '2024-10-08T00:00:00Z', trialEndsAt: '2024-11-07', lastActiveAt: '2024-10-20T11:00:00Z' },
  { id: 'org-5', displayName: 'Hope Community Church', slug: 'hope-community', country: 'US', tier: 'seed', status: 'trial', memberCount: 12, createdAt: '2024-10-18T00:00:00Z', trialEndsAt: '2024-10-28', lastActiveAt: '2024-10-19T14:20:00Z' },
  { id: 'org-6', displayName: 'Bethel Assembly', slug: 'bethel', country: 'ZA', tier: 'parish', status: 'suspended', memberCount: 310, createdAt: '2023-03-20T00:00:00Z', renewalDate: '2024-09-20', lastActiveAt: '2024-09-25T09:00:00Z' },
  { id: 'org-7', displayName: 'Trinity Old Town', slug: 'trinity-old-town', country: 'IE', tier: 'parish', status: 'canceled', memberCount: 176, createdAt: '2022-08-01T00:00:00Z', lastActiveAt: '2024-06-14T16:00:00Z' },
  { id: 'org-8', displayName: 'New Life Center', slug: 'new-life', country: 'US', tier: 'enterprise', status: 'active', memberCount: 15200, createdAt: '2022-02-01T00:00:00Z', renewalDate: '2025-02-01', lastActiveAt: '2024-10-22T09:05:00Z' },
];

export const MOCK_PLATFORM_METRICS: PlatformMetrics = {
  totalOrgs: MOCK_ORGS.length,
  activeOrgs: MOCK_ORGS.filter((o) => o.status === 'active').length,
  totalMembers: MOCK_ORGS.reduce((sum, o) => sum + o.memberCount, 0),
  newSignupsToday: 2,
  newSignupsThisWeek: 9,
  newSignupsThisMonth: 31,
  trialsEndingIn7Days: MOCK_ORGS.filter((o) => o.status === 'trial'),
  mrr: 18450,
  apiP50Ms: 48,
  apiP95Ms: 212,
  apiP99Ms: 640,
  errorRate: 0.004,
  queueDepth: 17,
};

/** MRR by month, for the platform metrics chart. */
export const MOCK_MRR_TREND = [
  { label: 'May', amount: 11200 },
  { label: 'Jun', amount: 12400 },
  { label: 'Jul', amount: 13100 },
  { label: 'Aug', amount: 14800 },
  { label: 'Sep', amount: 16900 },
  { label: 'Oct', amount: 18450 },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'al1', orgId: 'org-6', orgName: 'Bethel Assembly', userId: 'pa1', userName: 'Frank M.', action: 'org.suspended', resourceType: 'organisation', resourceId: 'org-6', ipAddress: '102.89.44.10', isImpersonated: false, createdAt: '2024-10-22T07:40:00Z' },
  { id: 'al2', orgId: 'org-4', orgName: 'Riverside Fellowship', userId: 'pa2', userName: 'Dana R.', action: 'impersonation.started', resourceType: 'session', isImpersonated: false, createdAt: '2024-10-22T06:15:00Z' },
  { id: 'al3', orgId: 'org-1', orgName: "St. Jude's Parish", userId: 'u1', userName: 'Sarah Thompson', action: 'member.exported', resourceType: 'member', metadata: { count: 248 }, ipAddress: '73.14.9.201', isImpersonated: false, createdAt: '2024-10-21T18:02:00Z' },
  { id: 'al4', orgId: 'org-4', orgName: 'Riverside Fellowship', userId: 'pa2', userName: 'Dana R.', action: 'trial.extended', resourceType: 'subscription', metadata: { days: 14 }, isImpersonated: false, createdAt: '2024-10-21T10:30:00Z' },
  { id: 'al5', orgId: 'org-2', orgName: 'Grace Chapel Nairobi', userId: 'u9', userName: 'Peter Otieno', action: 'donation.voided', resourceType: 'donation', metadata: { amount: 1200 }, isImpersonated: true, impersonatedBy: 'pa1', createdAt: '2024-10-20T13:45:00Z' },
  { id: 'al6', orgId: 'org-3', orgName: 'Lagos Diocese', userId: 'u21', userName: 'Grace Adeyemi', action: 'role.permissions_changed', resourceType: 'role', isImpersonated: false, createdAt: '2024-10-20T09:10:00Z' },
  { id: 'al7', orgId: 'org-8', orgName: 'New Life Center', userId: 'pa1', userName: 'Frank M.', action: 'subscription.tier_changed', resourceType: 'subscription', metadata: { from: 'diocese', to: 'enterprise' }, isImpersonated: false, createdAt: '2024-10-19T15:22:00Z' },
  { id: 'al8', orgId: 'org-1', orgName: "St. Jude's Parish", userId: 'u1', userName: 'Sarah Thompson', action: 'member.bulk_deleted', resourceType: 'member', metadata: { count: 6 }, isImpersonated: false, createdAt: '2024-10-18T11:05:00Z' },
];

/** Actions treated as critical and highlighted wherever the log is shown. */
export const CRITICAL_ACTIONS = [
  'org.suspended',
  'impersonation.started',
  'member.exported',
  'member.bulk_deleted',
  'donation.voided',
  'role.permissions_changed',
  'data.erasure_completed',
];

export const MOCK_DOMAINS: CustomDomain[] = [
  { id: 'dm1', tenantId: 'org-3', orgName: 'Lagos Diocese', domain: 'portal.lagosdiocese.org', status: 'active', sslProvisioned: true, verifiedAt: '2023-01-05T00:00:00Z', createdAt: '2023-01-02T00:00:00Z' },
  { id: 'dm2', tenantId: 'org-8', orgName: 'New Life Center', domain: 'my.newlifecenter.org', status: 'active', sslProvisioned: true, verifiedAt: '2022-03-01T00:00:00Z', createdAt: '2022-02-25T00:00:00Z' },
  { id: 'dm3', tenantId: 'org-2', orgName: 'Grace Chapel Nairobi', domain: 'church.gracenairobi.ke', status: 'pending_verification', sslProvisioned: false, createdAt: '2024-10-20T00:00:00Z' },
  { id: 'dm4', tenantId: 'org-6', orgName: 'Bethel Assembly', domain: 'portal.bethel.co.za', status: 'suspended', sslProvisioned: true, verifiedAt: '2023-04-01T00:00:00Z', createdAt: '2023-03-28T00:00:00Z' },
  { id: 'dm5', tenantId: 'org-7', orgName: 'Trinity Old Town', domain: 'members.trinityoldtown.ie', status: 'failed', sslProvisioned: false, createdAt: '2024-09-12T00:00:00Z' },
];

export const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  { code: 'certificates', label: 'Certificates', description: 'Issue and verify sacramental and membership certificates', tierDefault: false, currentValue: true, isOverridden: true, overrideSetBy: 'Dana R.', overrideSetAt: '2024-09-01T00:00:00Z', overrideExpiresAt: '2025-01-01', overrideNote: 'Beta pilot church' },
  { code: 'custom_domain', label: 'Custom domain', description: 'Serve the portal from the church’s own domain', tierDefault: false, currentValue: false, isOverridden: false },
  { code: 'advanced_analytics', label: 'Advanced analytics', description: 'Cohort retention and giving projections', tierDefault: false, currentValue: false, isOverridden: false },
  { code: 'sms_notifications', label: 'SMS notifications', description: 'Send announcements and reminders by SMS', tierDefault: true, currentValue: true, isOverridden: false },
  { code: 'api_access', label: 'API access', description: 'Programmatic access and webhooks', tierDefault: false, currentValue: true, isOverridden: true, overrideSetBy: 'Frank M.', overrideSetAt: '2024-08-14T00:00:00Z', overrideNote: 'Part of renewal negotiation' },
  { code: 'white_label', label: 'White-label branding', description: 'Remove EcclesiaFlow branding from emails and the portal', tierDefault: false, currentValue: false, isOverridden: false },
];

export const MOCK_ERASURE_REQUESTS: DataErasureRequest[] = [
  { id: 'er1', orgId: 'org-1', orgName: "St. Jude's Parish", memberId: 'm15', memberDisplayName: 'Noah Owens', requestedBy: 'Sarah Thompson', requestedAt: '2024-10-21T09:00:00Z', status: 'pending', notes: 'Member emailed requesting full erasure under GDPR.' },
  { id: 'er2', orgId: 'org-2', orgName: 'Grace Chapel Nairobi', memberId: 'm88', memberDisplayName: 'Member #88', requestedBy: 'Peter Otieno', requestedAt: '2024-10-18T14:30:00Z', status: 'approved', processedBy: 'Dana R.' },
  { id: 'er3', orgId: 'org-7', orgName: 'Trinity Old Town', memberId: 'm42', memberDisplayName: 'anon-4f2a91', requestedBy: 'Liam Byrne', requestedAt: '2024-09-30T11:15:00Z', status: 'completed', completedAt: '2024-10-02T10:00:00Z', processedBy: 'Frank M.' },
  { id: 'er4', orgId: 'org-3', orgName: 'Lagos Diocese', memberId: 'm991', memberDisplayName: 'Member #991', requestedBy: 'Grace Adeyemi', requestedAt: '2024-10-22T06:00:00Z', status: 'pending' },
];

/** Platform admins themselves — PA-14. */
export const MOCK_PLATFORM_ADMINS = [
  { id: 'pa1', name: 'Frank M.', email: 'frank@ecclesiaflow.com', level: 'PLATFORM_ADMIN' as const, mfaEnabled: true, lastLoginAt: '2024-10-22T07:30:00Z', impersonationCount: 4 },
  { id: 'pa2', name: 'Dana R.', email: 'dana@ecclesiaflow.com', level: 'PLATFORM_SUPPORT' as const, mfaEnabled: true, lastLoginAt: '2024-10-22T06:10:00Z', impersonationCount: 12 },
  { id: 'pa3', name: 'Ola A.', email: 'ola@ecclesiaflow.com', level: 'PLATFORM_SUPPORT' as const, mfaEnabled: false, lastLoginAt: '2024-10-15T12:00:00Z', impersonationCount: 0 },
];

/** System health signals for PA-13. */
export const MOCK_SYSTEM_HEALTH = {
  services: [
    { name: 'API', status: 'operational' as const, detail: 'p95 212ms' },
    { name: 'Database', status: 'operational' as const, detail: '18 / 100 connections' },
    { name: 'Redis', status: 'operational' as const, detail: 'running' },
    { name: 'Job queue', status: 'degraded' as const, detail: '17 queued, 3 failed' },
    { name: 'Object storage', status: 'operational' as const, detail: '412 GB used' },
  ],
  activeSessions: 1284,
  failedJobs: 3,
  rateLimitViolations: [
    { ip: '102.89.44.10', count: 214, lastSeen: '2024-10-22T08:10:00Z' },
    { ip: '41.203.7.88', count: 96, lastSeen: '2024-10-22T05:42:00Z' },
  ],
  recentErrors: [
    { id: 'e1', message: 'TimeoutError: statement timeout on donations aggregate', count: 7, lastSeen: '2024-10-22T07:55:00Z' },
    { id: 'e2', message: 'SMTPConnectionError: upstream refused', count: 3, lastSeen: '2024-10-22T04:20:00Z' },
  ],
};
