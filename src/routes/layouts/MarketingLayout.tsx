/**
 * @file MarketingLayout.tsx
 * @description Layout for public content: landing, pricing, calendar, contact, verification.
 *
 * Separate from PublicLayout for two reasons that only showed up once these
 * pages were rendered in a browser:
 *
 *  1. PublicLayout redirects any signed-in user to their dashboard. That is
 *     right for a login form and wrong for a pricing page — the billing screen
 *     links to /pricing, and that link only ever gets clicked by someone who is
 *     signed in.
 *  2. PublicLayout centres its child in a `max-w-md` column, which is right for
 *     an auth card and crushes a marketing page or a two-column pricing grid.
 *
 * Full width, no redirect, and a header that adapts to whether you are signed in.
 */
import { Link, Outlet } from 'react-router-dom';
import { useCurrentRole, useIsAuthenticated } from '@/hooks/useAuthStore';
import { ROLES } from '@/lib/constants';
import { APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui';

/** Where "back to the app" should land for a signed-in visitor. */
const HOME_BY_ROLE: Record<string, string> = {
  [ROLES.MEMBER]: '/portal',
  [ROLES.STAFF]: '/staff/dashboard',
  [ROLES.BOARD]: '/board/dashboard',
  [ROLES.PLATFORM_ADMIN]: '/platform/dashboard',
};

export function MarketingLayout() {
  const isAuthenticated = useIsAuthenticated();
  const role = useCurrentRole();
  const appHome = role ? HOME_BY_ROLE[role] : undefined;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-sticky border-b border-slate-200 dark:border-slate-800 bg-background-light/85 dark:bg-background-dark/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="font-display text-h3 text-slate-900 dark:text-slate-100">
            {APP_NAME}
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/churches">
              <Button variant="ghost" size="sm">
                Find a church
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>

            {isAuthenticated && appHome ? (
              <Link to={appHome}>
                <Button variant="primary" size="sm">
                  Back to the app
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
