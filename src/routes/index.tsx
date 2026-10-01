/**
 * @file index.tsx
 * @description Central routing configuration using React Router v6.
 *
 * Auth screens load eagerly — they are the first thing anyone sees, and a
 * spinner before the login form would be the app's first impression.
 *
 * Everything behind a login is code-split per screen via the router's own
 * `lazy` property. A member opening their giving history never downloads the
 * finance or platform-admin code, which matters on the phones and connections
 * this product is actually used on.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { MarketingLayout } from './layouts/MarketingLayout';
import { MemberLayout } from './layouts/MemberLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { BoardLayout } from './layouts/BoardLayout';
import { PlatformLayout } from './layouts/PlatformLayout';

import { LoginScreen } from './auth/LoginScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { ForgotPassword } from './auth/ForgotPassword';
import { ResetPassword } from './auth/ResetPassword';
import { MfaChallenge } from './auth/MfaChallenge';

import { NotFound, Forbidden, OfflineScreen, ServerError, SubscriptionExpired } from './system/ErrorScreens';

/**
 * Adapts a named export to the `{ Component }` shape the router's `lazy` expects.
 * Screens are named exports throughout, so the interop lives here rather than
 * forcing a default export on every file.
 */
function screen<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T & string,
) {
  return async () => ({ Component: (await load())[name] as React.ComponentType });
}

// --- Public marketing content (reachable signed in or out) ---
const marketingRoutes = {
  path: '/',
  element: <MarketingLayout />,
  children: [
    { index: true, lazy: screen(() => import('./public/LandingPage'), 'LandingPage') },
    { path: 'pricing', lazy: screen(() => import('./public/PricingPage'), 'PricingPage') },
    { path: 'contact', lazy: screen(() => import('./public/ContactDemo'), 'ContactDemo') },
    { path: 'verify/:hash', lazy: screen(() => import('./public/CertificateVerification'), 'CertificateVerification') },

    // Visitor → choose church → that church's own public page. Separate from
    // the EcclesiaFlow marketing pages above — this is a congregant looking
    // for their church, not a prospect evaluating the software.
    { path: 'churches', lazy: screen(() => import('./public/ChooseChurch'), 'ChooseChurch') },
    { path: 'c/:slug', lazy: screen(() => import('./public/ChurchLandingPage'), 'ChurchLandingPage') },
    { path: 'c/:slug/calendar', lazy: screen(() => import('./public/PublicEventCalendar'), 'PublicEventCalendar') },
  ],
};

// --- Auth (redirects away once signed in) ---
const publicRoutes = {
  path: '/',
  element: <PublicLayout />,
  children: [
    { path: 'login', element: <LoginScreen /> },
    { path: 'register', element: <RegisterScreen /> },
    { path: 'forgot-password', element: <ForgotPassword /> },
    { path: 'reset-password', element: <ResetPassword /> },
    { path: 'mfa/challenge', element: <MfaChallenge /> },
    { path: 'mfa/setup', lazy: screen(() => import('./auth/AuthStatusScreens'), 'MfaSetup') },
    { path: 'magic-link-sent', lazy: screen(() => import('./auth/AuthStatusScreens'), 'MagicLinkSent') },
    { path: 'verify-email', lazy: screen(() => import('./auth/AuthStatusScreens'), 'VerificationWaiting') },
    { path: 'account-locked', lazy: screen(() => import('./auth/AuthStatusScreens'), 'AccountLocked') },
    { path: 'session-expired', lazy: screen(() => import('./auth/AuthStatusScreens'), 'SessionExpired') },
    { path: 'onboarding/complete', lazy: screen(() => import('./onboarding/WizardComplete'), 'WizardComplete') },
    {
      path: 'onboarding',
      lazy: screen(() => import('./onboarding/OnboardingWizard'), 'OnboardingWizard'),
    },
  ],
};

// --- Member Portal ---
const memberRoutes = {
  path: '/portal',
  element: <MemberLayout />,
  children: [
    { index: true, lazy: screen(() => import('./portal/PortalHome'), 'PortalHome') },
    { path: 'profile', lazy: screen(() => import('./portal/MyProfile'), 'MyProfile') },
    { path: 'giving', lazy: screen(() => import('./portal/MyGiving'), 'MyGiving') },
    { path: 'events', lazy: screen(() => import('./portal/UpcomingEvents'), 'UpcomingEvents') },
    { path: 'events/:id', lazy: screen(() => import('./portal/MemberEventDetail'), 'MemberEventDetail') },
    {
      path: 'notifications',
      lazy: screen(() => import('./portal/NotificationInbox'), 'NotificationInbox'),
    },
    {
      path: 'announcements',
      lazy: screen(() => import('./portal/AnnouncementBoard'), 'AnnouncementBoard'),
    },
  ],
};

// --- Staff ---
const staffRoutes = {
  path: '/staff',
  element: <StaffLayout />,
  children: [
    { path: 'dashboard', lazy: screen(() => import('./staff/StaffDashboard'), 'StaffDashboard') },

    // People — literal segments are declared before ':id' so they are not read as one
    { path: 'members', lazy: screen(() => import('./staff/MembersList'), 'MembersList') },
    { path: 'members/add', lazy: screen(() => import('./staff/people/MemberForm'), 'MemberForm') },
    { path: 'members/not-seen', lazy: screen(() => import('./staff/people/NotSeenRecently'), 'NotSeenRecently') },
    { path: 'members/visitor-followup', lazy: screen(() => import('./staff/people/VisitorFollowUp'), 'VisitorFollowUp') },
    { path: 'members/:id', lazy: screen(() => import('./staff/MemberProfileStaff'), 'MemberProfileStaff') },
    { path: 'members/:id/edit', lazy: screen(() => import('./staff/people/MemberForm'), 'MemberForm') },

    { path: 'members/export', lazy: screen(() => import('./staff/people/MemberCsvExport'), 'MemberCsvExport') },
    { path: 'households/:id', lazy: screen(() => import('./staff/people/HouseholdView'), 'HouseholdView') },

    // Attendance
    { path: 'attendance/take', lazy: screen(() => import('./staff/TakeAttendance'), 'TakeAttendance') },
    { path: 'attendance/headcount', lazy: screen(() => import('./staff/HeadcountEntry'), 'HeadcountEntry') },
    { path: 'attendance/report', lazy: screen(() => import('./staff/AttendanceReport'), 'AttendanceReport') },

    // Gatherings
    { path: 'events', lazy: screen(() => import('./staff/EventsList'), 'EventsList') },
    { path: 'events/new', lazy: screen(() => import('./staff/CreateEditEvent'), 'CreateEditEvent') },
    { path: 'events/:id', lazy: screen(() => import('./staff/EventDetail'), 'EventDetail') },
    { path: 'events/:id/edit', lazy: screen(() => import('./staff/CreateEditEvent'), 'CreateEditEvent') },

    // Structure
    { path: 'hierarchy', lazy: screen(() => import('./staff/hierarchy/HierarchyTreeView'), 'HierarchyTreeView') },
    { path: 'hierarchy/units/:id', lazy: screen(() => import('./staff/hierarchy/UnitDetail'), 'UnitDetail') },

    // Analytics & media
    { path: 'analytics', lazy: screen(() => import('./staff/AnalyticsDashboard'), 'AnalyticsDashboard') },
    { path: 'documents', lazy: screen(() => import('./staff/DocumentLibrary'), 'DocumentLibrary') },

    // Giving
    { path: 'finance', lazy: screen(() => import('./staff/finance/FinanceDashboard'), 'FinanceDashboard') },
    { path: 'finance/batches', lazy: screen(() => import('./staff/finance/DonationBatches'), 'DonationBatches') },
    { path: 'finance/batches/:batchId/donations/new', lazy: screen(() => import('./staff/finance/DonationEntry'), 'DonationEntry') },
    { path: 'finance/batches/:batchId/review', lazy: screen(() => import('./staff/finance/BatchReviewClose'), 'BatchReviewClose') },
    { path: 'finance/batches/:batchId/void', lazy: screen(() => import('./staff/finance/DonationVoid'), 'DonationVoid') },
    { path: 'finance/funds', lazy: screen(() => import('./staff/finance/FundManagement'), 'FundManagement') },
    { path: 'finance/pledges', lazy: screen(() => import('./staff/finance/PledgeManagement'), 'PledgeManagement') },
    { path: 'finance/reports', lazy: screen(() => import('./staff/finance/GivingReports'), 'GivingReports') },
    { path: 'finance/statements', lazy: screen(() => import('./staff/finance/ContributionStatements'), 'ContributionStatements') },
    { path: 'finance/statements/preview', lazy: screen(() => import('./staff/finance/StatementPreview'), 'StatementPreview') },

    // Communications
    { path: 'comms/announcements', lazy: screen(() => import('./staff/comms/AnnouncementsList'), 'AnnouncementsList') },
    { path: 'comms/announcements/new', lazy: screen(() => import('./staff/comms/CreateAnnouncement'), 'CreateAnnouncement') },
    { path: 'comms/announcements/:id', lazy: screen(() => import('./staff/comms/AnnouncementDetail'), 'AnnouncementDetail') },

    // Team & roles
    { path: 'team', lazy: screen(() => import('./staff/team/TeamAndRoles'), 'TeamAndRoles') },
    { path: 'team/invite', lazy: screen(() => import('./staff/team/InviteStaff'), 'InviteStaff') },
    { path: 'team/roles/new', lazy: screen(() => import('./staff/team/CustomRoleBuilder'), 'CustomRoleBuilder') },
    { path: 'team/leadership', lazy: screen(() => import('./staff/team/ChurchLeadership'), 'ChurchLeadership') },
    { path: 'team/leadership/transfer', lazy: screen(() => import('./staff/team/TransferLeadership'), 'TransferLeadership') },

    // Settings
    { path: 'settings', lazy: screen(() => import('./staff/settings/OrganisationSettings'), 'OrganisationSettings') },
    { path: 'settings/security', lazy: screen(() => import('./staff/settings/SecuritySettings'), 'SecuritySettings') },
    { path: 'settings/notifications', lazy: screen(() => import('./staff/settings/NotificationPreferences'), 'NotificationPreferences') },
    { path: 'settings/billing', lazy: screen(() => import('./staff/settings/SubscriptionBilling'), 'SubscriptionBilling') },
    { path: 'settings/data', lazy: screen(() => import('./staff/settings/DataPrivacy'), 'DataPrivacy') },
    { path: 'settings/integrations', lazy: screen(() => import('./staff/settings/ApiIntegrations'), 'ApiIntegrations') },

    // Certificates
    { path: 'certificates', lazy: screen(() => import('./staff/certificates/CertificateTemplates'), 'CertificateTemplates') },
    { path: 'certificates/issue', lazy: screen(() => import('./staff/certificates/IssueCertificate'), 'IssueCertificate') },
    { path: 'certificates/bulk-issue', lazy: screen(() => import('./staff/certificates/BulkIssue'), 'BulkIssue') },
    { path: 'certificates/issued/:id', lazy: screen(() => import('./staff/certificates/IssuedCertificateDetail'), 'IssuedCertificateDetail') },
    { path: 'certificates/templates/:id/design', lazy: screen(() => import('./staff/certificates/TemplateDesigner'), 'TemplateDesigner') },
  ],
};

// --- Board ---
const boardRoutes = {
  path: '/board',
  element: <BoardLayout />,
  children: [
    { path: 'dashboard', lazy: screen(() => import('./board/NetworkDashboard'), 'NetworkDashboard') },
    { path: 'hierarchy', lazy: screen(() => import('./staff/hierarchy/HierarchyTreeView'), 'HierarchyTreeView') },
    { path: 'units/:id', lazy: screen(() => import('./staff/hierarchy/UnitDetail'), 'UnitDetail') },
    { path: 'organisations', lazy: screen(() => import('./platform/OrganisationsList'), 'OrganisationsList') },
    { path: 'organisations/:id', lazy: screen(() => import('./platform/OrganisationDetail'), 'OrganisationDetail') },
    { path: 'reports/parish-comparison', lazy: screen(() => import('./board/NetworkDashboard'), 'NetworkDashboard') },
    { path: 'domains', lazy: screen(() => import('./board/DomainManagement'), 'DomainManagement') },
    { path: 'white-label', lazy: screen(() => import('./board/WhiteLabelSettings'), 'WhiteLabelSettings') },
  ],
};

// --- Platform Admin ---
const platformRoutes = {
  path: '/platform',
  element: <PlatformLayout />,
  children: [
    { path: 'login', lazy: screen(() => import('./platform/PlatformLogin'), 'PlatformLogin') },
    { path: 'dashboard', lazy: screen(() => import('./platform/PlatformDashboard'), 'PlatformDashboard') },

    // Organisations — 'new' before ':id' so it is not read as an id
    { path: 'orgs', lazy: screen(() => import('./platform/OrganisationsList'), 'OrganisationsList') },
    { path: 'orgs/new', lazy: screen(() => import('./platform/RegisterOrganisation'), 'RegisterOrganisation') },
    { path: 'orgs/:id', lazy: screen(() => import('./platform/OrganisationDetail'), 'OrganisationDetail') },
    { path: 'orgs/:id/billing', lazy: screen(() => import('./platform/SubscriptionManagement'), 'SubscriptionManagement') },
    { path: 'orgs/:id/flags', lazy: screen(() => import('./platform/FeatureFlagOverrides'), 'FeatureFlagOverrides') },

    { path: 'impersonate', lazy: screen(() => import('./platform/Impersonation'), 'Impersonation') },
    { path: 'announcements', lazy: screen(() => import('./platform/PlatformAnnouncements'), 'PlatformAnnouncements') },
    { path: 'audit-log', lazy: screen(() => import('./platform/PlatformAuditLog'), 'PlatformAuditLog') },
    { path: 'metrics', lazy: screen(() => import('./platform/PlatformMetrics'), 'PlatformMetrics') },
    { path: 'system-health', lazy: screen(() => import('./platform/SystemHealth'), 'SystemHealth') },
    { path: 'admins', lazy: screen(() => import('./platform/PlatformAdminUsers'), 'PlatformAdminUsers') },
    { path: 'data-erasure', lazy: screen(() => import('./platform/DataErasureQueue'), 'DataErasureQueue') },
    { path: 'domains', lazy: screen(() => import('./board/DomainManagement'), 'DomainManagement') },
  ],
};

// --- Error Pages ---
const errorRoutes = [
  { path: '/403', element: <Forbidden /> },
  { path: '/404', element: <NotFound /> },
  { path: '/500', element: <ServerError /> },
  { path: '/offline', element: <OfflineScreen /> },
  { path: '/subscription-expired', element: <SubscriptionExpired /> },
  { path: '*', element: <Navigate to="/404" replace /> },
];

export const router = createBrowserRouter([
  marketingRoutes,
  publicRoutes,
  memberRoutes,
  staffRoutes,
  boardRoutes,
  platformRoutes,
  ...errorRoutes,
]);
