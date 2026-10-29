/**
 * @file PlatformLayout.tsx
 * @description Layout for SaaS Platform Admins. Distinct dark theme to prevent confusion.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '@/services/paymentsService';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Banknote,
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
import { SideNav, TopHeader, NavDrawer, TopBar, PageGuide, UserMenu } from '@/components/layout';

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
      { label: 'Payments', href: '/platform/payments', icon: Banknote },
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
  // Payments waiting for approval, shown on the nav item so nothing sits unseen.
  const { data: waiting = 0 } = useQuery({
    queryKey: ['platform', 'payments', 'pending-count'],
    queryFn: () => paymentsService.pendingCount(),
    enabled: isAuthenticated && isPlatformAdmin,
    refetchInterval: 60_000,
  });
  const sections = SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => (item.href === '/platform/payments' ? { ...item, badgeCount: waiting } : item)),
  }));

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
        sections={sections}
        orgName="EcclesiaFlow"
        brandSubtitle="Platform"
        user={signedInAs}
        profileHref="/platform/account"
        loginPath="/platform/login"
        primaryAction={{ label: 'Register org', href: '/platform/orgs/new', icon: Plus }}
        variant="platform"
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden">
          <TopHeader 
            title="Platform Admin"
            leftAction="menu"
            onMenuClick={() => setMenuOpen(true)}
            rightActions={[<UserMenu key="account" user={signedInAs} profileHref="/platform/account" loginPath="/platform/login" display="avatar" variant="platform" />]}
          />
        </div>

        <TopBar user={signedInAs} profileHref="/platform/account" loginPath="/platform/login" variant="platform" />

        <div className="flex-1 overflow-y-auto">
          <Outlet />
          <PageGuide />
        </div>
      </div>

      <NavDrawer
        open={isMenuOpen}
        onClose={() => setMenuOpen(false)}
        sections={sections}
        orgName="EcclesiaFlow Admin"
        user={signedInAs}
        profileHref="/platform/account"
        loginPath="/platform/login"
        variant="platform"
      />
    </div>
  );
}
