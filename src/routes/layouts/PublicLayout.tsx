/**
 * @file PublicLayout.tsx
 * @description Layout for unauthenticated screens (login, register, forgot password).
 */
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useCurrentRole } from '@/hooks/useAuthStore';
import { homePath } from '@/lib/home';
import { SiteHeader } from '@/components/layout';

export function PublicLayout() {
  const isAuthenticated = useIsAuthenticated();
  const role = useCurrentRole();
  const location = useLocation();

  if (isAuthenticated && role) {
    // Redirect away from auth pages if already logged in
    const from = (location.state as any)?.from?.pathname;
    if (from) return <Navigate to={from} replace />;
    
    return <Navigate to={homePath(role)} replace />;
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col relative overflow-hidden">
      <SiteHeader />
      <div className="flex flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Decorative background element */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-light via-surface to-surface" />
      
      <div className="relative z-10 w-full mx-auto max-w-md">
        <Outlet />
      </div>
      </div>
    </div>
  );
}
