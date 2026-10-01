/**
 * @file PlatformLayout.tsx
 * @description Layout for SaaS Platform Admins. Distinct dark theme to prevent confusion.
 */
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Building2,
  Database,
  Eye,
  Globe,
  Megaphone,
  ShieldAlert,
  TrendingUp,
  Users,
  Plus,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { SideNav, TopHeader, NavDrawer, TopBar } from '@/components/layout';

const SIDEBAR_SECTIONS = [
  {
    items: [
      { label: 'Platform Hub', href: '/platform/dashboard', icon: Activity },
    ]
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Organisations', href: '/platform/orgs', icon: Building2 },
      { label: 'Impersonate', href: '/platform/impersonate', icon: Eye },
      { label: 'Domains', href: '/platform/domains', icon: Globe },
    ]
  },
  {
    title: 'Business',
    items: [
      { label: 'Metrics', href: '/platform/metrics', icon: TrendingUp },
      { label: 'Announcements', href: '/platform/announcements', icon: Megaphone },
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Health', href: '/platform/system-health', icon: Activity },
      { label: 'Audit Log', href: '/platform/audit-log', icon: ShieldAlert },
      { label: 'Erasure Queue', href: '/platform/data-erasure', icon: Database },
      { label: 'Platform Team', href: '/platform/admins', icon: Users },
    ]
  }
];

export function PlatformLayout() {
  const { isPlatformAdmin, isAuthenticated } = useRole();
  const location = useLocation();
  const user = useCurrentUser();
  const [isMenuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />;
  }
  
  if (!isPlatformAdmin) {
    return <Navigate to="/403" replace />;
  }

  // Force dark mode wrapper for platform admin to distinct it from tenant views
  const signedInAs = {
    name: user ? `${user.firstName} ${user.lastName}` : 'Signed in',
    subtitle: "Platform admin",
    photoUrl: user?.photoUrl,
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 dark">
      <SideNav
        sections={SIDEBAR_SECTIONS}
        orgName="EcclesiaFlow"
        brandSubtitle="Platform"
        user={signedInAs}
        primaryAction={{ label: 'Register org', href: '/platform/orgs/new', icon: Plus }}
        variant="platform"
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden">
          <TopHeader 
            title="Platform Admin"
            leftAction="menu"
            onMenuClick={() => setMenuOpen(true)} 
          />
        </div>

        <TopBar user={signedInAs} notificationCount={1} variant="platform" />

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <NavDrawer
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}
        sections={SIDEBAR_SECTIONS}
        orgName="EcclesiaFlow Admin"
        variant="platform"
      />
    </div>
  );
}
