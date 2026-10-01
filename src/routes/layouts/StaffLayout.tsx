/**
 * @file StaffLayout.tsx
 * @description Layout for Staff users with Sidebar (desktop) and Tab Bar (mobile).
 */
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Award,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  FolderOpen,
  HeartHandshake,
  Home,
  Megaphone,
  Network,
  Settings,
  Target,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { SideNav, BottomTabBar, NavDrawer, TopBar, TopHeader } from '@/components/layout';

const SIDEBAR_SECTIONS = [
  {
    items: [{ label: 'Dashboard', href: '/staff/dashboard', icon: Home }],
  },
  {
    title: 'People',
    items: [
      { label: 'Directory', href: '/staff/members', icon: Users },
      { label: 'Follow-ups', href: '/staff/members/visitor-followup', icon: HeartHandshake },
      { label: 'Not seen recently', href: '/staff/members/not-seen', icon: UserMinus },
    ],
  },
  {
    title: 'Gatherings',
    items: [
      { label: 'Events', href: '/staff/events', icon: CalendarDays },
      { label: 'Take attendance', href: '/staff/attendance/take', icon: CalendarCheck },
      { label: 'Attendance report', href: '/staff/attendance/report', icon: BarChart3 },
    ],
  },
  {
    title: 'Giving',
    items: [
      { label: 'Overview', href: '/staff/finance', icon: Banknote },
      { label: 'Offering batches', href: '/staff/finance/batches', icon: Wallet },
      { label: 'Funds', href: '/staff/finance/funds', icon: Banknote },
      { label: 'Pledges', href: '/staff/finance/pledges', icon: Target },
      { label: 'Reports', href: '/staff/finance/reports', icon: BarChart3 },
      { label: 'Statements', href: '/staff/finance/statements', icon: FolderOpen },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Announcements', href: '/staff/comms/announcements', icon: Megaphone },
      { label: 'Certificates', href: '/staff/certificates', icon: Award },
      { label: 'Documents', href: '/staff/documents', icon: FolderOpen },
      { label: 'Structure', href: '/staff/hierarchy', icon: Network },
      { label: 'Analytics', href: '/staff/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Team & roles', href: '/staff/team', icon: Users },
      { label: 'Settings', href: '/staff/settings', icon: Settings },
    ],
  },
];

/** Ordered longest-first; the first matching prefix names the screen. */
const SECTION_TITLES: Array<[string, string]> = [
  ['/staff/members/visitor-followup', 'Follow-ups'],
  ['/staff/members/not-seen', 'Not seen recently'],
  ['/staff/members/export', 'Export directory'],
  ['/staff/members/add', 'Add a person'],
  ['/staff/members', 'Directory'],
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
  const { isStaff, isAuthenticated, isBoard } = useRole();
  const user = useCurrentUser();
  const location = useLocation();
  const [isMenuOpen, setMenuOpen] = useState(false);

  // Allow board members to access staff views as well
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!isStaff && !isBoard) {
    return <Navigate to="/403" replace />;
  }

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
        sections={SIDEBAR_SECTIONS}
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
        sections={SIDEBAR_SECTIONS}
        orgName={user?.tenantName}
      />
    </div>
  );
}
