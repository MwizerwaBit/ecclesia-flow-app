/**
 * @file StaffLayout.tsx
 * @description Layout for Staff users with Sidebar (desktop) and Tab Bar (mobile).
 */
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
// The nav's icons now come from the module registry; these are only the ones
// this layout uses directly.
import { Banknote, CalendarDays, Home, UserPlus, Users } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { useModules } from '@/modules/useModules';
import { buildStaffNav } from '@/modules/nav';
import { SideNav, BottomTabBar, NavDrawer, TopBar, TopHeader } from '@/components/layout';


/** Ordered longest-first; the first matching prefix names the screen. */
const SECTION_TITLES: Array<[string, string]> = [
  ['/staff/members/visitor-followup', 'Follow-ups'],
  ['/staff/members/not-seen', 'Not seen recently'],
  ['/staff/members/export', 'Export directory'],
  ['/staff/members/add', 'Add a person'],
  ['/staff/members', 'Directory'],
  ['/staff/groups/new', 'New group'],
  ['/staff/groups/roles', 'Group roles'],
  ['/staff/events/reviews', 'Reviews'],
  ['/staff/team/structure', 'Leadership structure'],
  ['/staff/groups', 'Groups'],
  ['/staff/households', 'Household'],
  ['/staff/attendance/headcount', 'Headcount'],
  ['/staff/attendance/report', 'Attendance report'],
  ['/staff/attendance', 'Attendance'],
  ['/staff/events', 'Gatherings'],
  ['/staff/hierarchy', 'Structure'],
  ['/staff/analytics', 'Analytics'],
  ['/staff/documents', 'Documents'],
  ['/staff/finance/statements', 'Statements'],
  ['/staff/finance/batches', 'Offering batches'],
  ['/staff/finance/pledges', 'Pledges'],
  ['/staff/finance/reports', 'Giving reports'],
  ['/staff/finance/funds', 'Funds'],
  ['/staff/finance', 'Giving'],
  ['/staff/certificates', 'Certificates'],
  ['/staff/comms', 'Announcements'],
  ['/staff/team/leadership', 'Church leadership'],
  ['/staff/team', 'Team & roles'],
  ['/staff/settings', 'Settings'],
];

const MOBILE_TABS = [
  { label: 'Home', href: '/staff/dashboard', icon: Home },
  { label: 'Members', href: '/staff/members', icon: Users },
  { label: 'Give', href: '/staff/finance', icon: Banknote },
  { label: 'Events', href: '/staff/events', icon: CalendarDays },
];

export function StaffLayout() {
  const { isStaff, isAuthenticated, isBoard, can } = useRole();
  const user = useCurrentUser();
  const { modules: allModules } = useModules();
  const location = useLocation();
  const [isMenuOpen, setMenuOpen] = useState(false);

  // Allow board members to access staff views as well
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStaff && !isBoard) {
    return <Navigate to="/403" replace />;
  }

  // The sidebar is derived, not declared: a module the church has not
  // subscribed to contributes nothing, and neither does one this role cannot
  // reach. Adding a module to the registry puts it here automatically.
  const sections = buildStaffNav(allModules, can);

  // Longest prefix wins, so /staff/finance/batches resolves before /staff/finance.
  // The words here match what each screen calls itself and what the nav calls it —
  // a header reading "Finance" above a page titled "Giving" reads as two products.
  const getRouteTitle = () => {
    const match = SECTION_TITLES.find(([prefix]) => location.pathname.startsWith(prefix));
    return match ? match[1] : 'Dashboard';
  };

  const signedInAs = {
    name: user ? `${user.firstName} ${user.lastName}` : 'Signed in',
    subtitle: user?.tenantName,
    photoUrl: user?.photoUrl,
  };

  return (
    // h-dvh + overflow-hidden (not min-h-screen) so this is the actual scroll
    // boundary — without it the column below never hits a height ceiling, the
    // whole document scrolls instead, and the pb-tab-content-pb reserve below
    // can't reliably clear the fixed tab bar.
    <div className="flex h-dvh overflow-hidden bg-background-light dark:bg-background-dark">
      <SideNav
        sections={sections}
        orgName={user?.tenantName ?? 'EcclesiaFlow'}
        brandSubtitle="Church management"
        user={signedInAs}
        primaryAction={{ label: 'Add member', href: '/staff/members/add', icon: UserPlus }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Phone: title and the menu. Desktop: the sidebar is the menu. */}
        <div className="lg:hidden">
          <TopHeader
            title={getRouteTitle()}
            leftAction="menu"
            onMenuClick={() => setMenuOpen(true)}
          />
        </div>

        <TopBar user={signedInAs} notificationCount={2} />

        {/* The tab bar is fixed over this column, so the column reserves
            room for it. Screens inside do not repeat this. */}
        <div className="flex-1 overflow-y-auto pb-tab-content-pb lg:pb-0">
          <Outlet />
        </div>

        <BottomTabBar items={MOBILE_TABS} />
      </div>

      <NavDrawer
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}
        sections={sections}
        orgName={user?.tenantName}
      />
    </div>
  );
}
