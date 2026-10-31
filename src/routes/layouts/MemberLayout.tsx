/**
 * @file MemberLayout.tsx
 * @description Layout for congregant (Member) users. Mobile-optimized with Tab Bar.
 */
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Home, Heart, Calendar, Bell, UsersRound } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { BottomTabBar, TopHeader, PageGuide, UserMenu } from '@/components/layout';
import { useUnreadCount } from '@/hooks/useNotifications';

const BASE_TABS = [
  { label: 'Home', href: '/portal', icon: Home },
  { label: 'Giving', href: '/portal/giving', icon: Heart },
  { label: 'Events', href: '/portal/events', icon: Calendar },
  { label: 'Groups', href: '/portal/groups', icon: UsersRound },
];

export function MemberLayout() {
  const { isMember, isAuthenticated } = useRole();
  const user = useCurrentUser();
  const location = useLocation();
  const unread = useUnreadCount().data ?? 0;
  const tabs = [...BASE_TABS, { label: 'Alerts', href: '/portal/notifications', icon: Bell, badgeCount: unread }];

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!isMember) {
    // If a staff logs in but tries to hit portal, that's okay, but they might want to use staff dashboard
    // For now, let's enforce member-only to portal, or redirect them back to their dash
    return <Navigate to="/" replace />; 
  }

  return (
    // h-dvh + overflow-hidden (not min-h-screen) so this is the actual scroll
    // boundary — without it the column below never hits a height ceiling, the
    // whole document scrolls instead, and the pb-tab-content-pb reserve below
    // can't reliably clear the fixed tab bar.
    <div className="flex flex-col h-dvh overflow-hidden bg-background-light dark:bg-background-dark">
      {/* The church's own name, and the account menu. (The header used to carry a
          menu button that only logged to the console, and a hard-coded church.) */}
      <TopHeader
        title={user?.tenantName ?? 'EcclesiaFlow'}
        rightActions={[
          <UserMenu
            key="account"
            user={{
              name: user ? `${user.firstName} ${user.lastName}` : 'Signed in',
              subtitle: user?.tenantName,
              photoUrl: user?.photoUrl,
            }}
            profileHref="/portal/profile"
            display="avatar"
          />,
        ]}
      />
      
      {/* The tab bar is fixed over this column, so the column reserves
            room for it. Screens inside do not repeat this. */}
        <div className="flex-1 overflow-y-auto pb-tab-content-pb lg:pb-0">
        <Outlet />
        <PageGuide />
      </div>
      
      <BottomTabBar items={tabs} />
    </div>
  );
}
