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
import { buildModuleRoutes } from '@/modules/routes';
import { MemberLayout } from './layouts/MemberLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { BoardLayout } from './layouts/BoardLayout';
import { PlatformLayout } from './layouts/PlatformLayout';
import { FocusLayout } from './layouts/FocusLayout';

import { LoginScreen } from './auth/LoginScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { ForgotPassword } from './auth/ForgotPassword';
import { ResetPassword } from './auth/ResetPassword';
import { MfaChallenge } from './auth/MfaChallenge';

import { NotFound, Forbidden, OfflineScreen, ServerError, SubscriptionExpired } from './system/ErrorScreens';
import { NotificationsEntry } from './notifications/NotificationScreens';

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
    { path: 'c/:slug/events/:eventId', lazy: screen(() => import('./public/PublicEventRegister'), 'PublicEventRegister') },
    { path: 'c/:slug/join', lazy: screen(() => import('./public/JoinChurch'), 'JoinChurch') },
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
    { path: 'accept-invite', lazy: screen(() => import('./auth/AcceptInvite'), 'AcceptInvite') },
    // Same sign-in look and flow as everyone's; lives here (not under the platform layout,
    // which sends signed-out visitors to this very page).
    { path: 'platform/login', lazy: screen(() => import('./platform/PlatformLogin'), 'PlatformLogin') },
  ],
};

// --- Onboarding ---
// Deliberately not under publicRoutes/PublicLayout: registering (step 1) signs
// the new leader in immediately, so PublicLayout's "redirect away if already
// authenticated" guard would bounce them straight to the dashboard before the
// wizard ever rendered. FocusLayout only adds the site header (home, theme).
const onboardingRoutes = {
  path: '/',
  element: <FocusLayout />,
  children: [
    { path: 'onboarding/complete', lazy: screen(() => import('./onboarding/WizardComplete'), 'WizardComplete') },
    { path: 'onboarding/plan', lazy: screen(() => import('./onboarding/PlanPicker'), 'PlanPicker') },
    // Checkout is part of onboarding (and plan changes): full-page, no app chrome.
    { path: 'billing/pay', lazy: screen(() => import('./billing/ManualPayment'), 'ManualPayment') },
    { path: 'billing/checkout/:sessionId', lazy: screen(() => import('./billing/DemoCheckout'), 'DemoCheckout') },
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
    { path: 'groups', lazy: screen(() => import('./portal/MyGroups'), 'MyGroups') },
    { path: 'groups/:id', lazy: screen(() => import('./portal/MyGroupDetail'), 'MyGroupDetail') },
    { path: 'notifications', lazy: screen(() => import('./notifications/NotificationScreens'), 'NotificationsScreen') },
    {
      path: 'notifications/preferences',
      lazy: screen(() => import('./notifications/NotificationScreens'), 'NotificationSettingsScreen'),
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
    { path: 'account', lazy: screen(() => import('./account/MyAccount'), 'MyAccount') },
    { path: 'notifications', lazy: screen(() => import('./notifications/NotificationScreens'), 'NotificationsScreen') },

    // Everything else on this surface comes from the module registry, so a
    // module is added by editing src/modules/registry.ts and nothing here.
    ...buildModuleRoutes(),
  ],
};

// --- Board ---
const boardRoutes = {
  path: '/board',
  element: <BoardLayout />,
  children: [
    { path: 'dashboard', lazy: screen(() => import('./board/NetworkDashboard'), 'NetworkDashboard') },
    { path: 'account', lazy: screen(() => import('./account/MyAccount'), 'MyAccount') },
    { path: 'notifications', lazy: screen(() => import('./notifications/NotificationScreens'), 'NotificationsScreen') },
    {
      path: 'notifications/preferences',
      lazy: screen(() => import('./notifications/NotificationScreens'), 'NotificationSettingsScreen'),
    },
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
    { path: 'dashboard', lazy: screen(() => import('./platform/PlatformDashboard'), 'PlatformDashboard') },
    { path: 'account', lazy: screen(() => import('./account/MyAccount'), 'MyAccount') },

    // Organisations — 'new' before ':id' so it is not read as an id
    { path: 'orgs', lazy: screen(() => import('./platform/OrganisationsList'), 'OrganisationsList') },
    { path: 'orgs/new', lazy: screen(() => import('./platform/RegisterOrganisation'), 'RegisterOrganisation') },
    { path: 'orgs/:id', lazy: screen(() => import('./platform/OrganisationDetail'), 'OrganisationDetail') },
    { path: 'orgs/:id/billing', lazy: screen(() => import('./platform/SubscriptionManagement'), 'SubscriptionManagement') },
    { path: 'orgs/:id/flags', lazy: screen(() => import('./platform/FeatureFlagOverrides'), 'FeatureFlagOverrides') },

    { path: 'impersonate', lazy: screen(() => import('./platform/Impersonation'), 'Impersonation') },
    { path: 'announcements', lazy: screen(() => import('./platform/PlatformAnnouncements'), 'PlatformAnnouncements') },
    { path: 'payments', lazy: screen(() => import('./platform/PaymentApprovals'), 'PaymentApprovals') },
    { path: 'audit-log', lazy: screen(() => import('./platform/PlatformAuditLog'), 'PlatformAuditLog') },
    { path: 'metrics', lazy: screen(() => import('./platform/PlatformMetrics'), 'PlatformMetrics') },
    { path: 'system-health', lazy: screen(() => import('./platform/SystemHealth'), 'SystemHealth') },
    { path: 'admins', lazy: screen(() => import('./platform/PlatformAdminUsers'), 'PlatformAdminUsers') },
    { path: 'data-erasure', lazy: screen(() => import('./platform/DataErasureQueue'), 'DataErasureQueue') },
    { path: 'domains', lazy: screen(() => import('./board/DomainManagement'), 'DomainManagement') },
  ],
};

// --- Error Pages ---
// Links that can't know who opens them (the footer of a notification email) land here and are
// sent on to the signed-in person's own area.
const notificationEntryRoutes = [
  { path: '/notifications', element: <NotificationsEntry to="inbox" /> },
  { path: '/notifications/preferences', element: <NotificationsEntry to="preferences" /> },
];

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
  onboardingRoutes,
  ...notificationEntryRoutes,
  memberRoutes,
  staffRoutes,
  boardRoutes,
  platformRoutes,
  ...errorRoutes,
]);
