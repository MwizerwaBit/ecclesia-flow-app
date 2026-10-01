/**
 * @file BoardLayout.tsx
 * @description Layout for Board / Network admins. Similar to staff but with hierarchy/network tools.
 */
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { BarChart, Globe, Network, Plus, Settings } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { SideNav, TopHeader, NavDrawer, TopBar } from '@/components/layout';

const SIDEBAR_SECTIONS = [
  {
    items: [
      { label: 'Network Overview', href: '/board/dashboard', icon: BarChart },
    ]
  },
  {
    title: 'Structure',
    items: [
      { label: 'Hierarchy', href: '/board/hierarchy', icon: Network },
      { label: 'Organisations', href: '/board/organisations', icon: Globe },
    ]
  },
  {
    title: 'Reports',
    items: [
      { label: 'Parish Comparison', href: '/board/reports/parish-comparison', icon: BarChart },
    ]
  },
  {
    title: 'Settings',
    items: [
      { label: 'Domains', href: '/board/domains', icon: Globe },
      { label: 'White-label', href: '/board/white-label', icon: Settings },
    ]
  }
];

export function BoardLayout() {
  const { isBoard, isAuthenticated } = useRole();
  const location = useLocation();
  const user = useCurrentUser();
  const [isMenuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!isBoard) {
    return <Navigate to="/403" replace />;
  }

  const signedInAs = {
    name: user ? `${user.firstName} ${user.lastName}` : 'Signed in',
    subtitle: user?.tenantName,
    photoUrl: user?.photoUrl,
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      <SideNav
        sections={SIDEBAR_SECTIONS}
        orgName="Diocese of Grace"
        brandSubtitle="Network administration"
        user={signedInAs}
        primaryAction={{ label: 'Add unit', href: '/board/hierarchy', icon: Plus }}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden">
          <TopHeader 
            title="Network Admin"
            leftAction="menu"
            onMenuClick={() => setMenuOpen(true)} 
          />
        </div>

        <TopBar user={signedInAs} notificationCount={1} />

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <NavDrawer
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}
        sections={SIDEBAR_SECTIONS}
      />
    </div>
  );
}
