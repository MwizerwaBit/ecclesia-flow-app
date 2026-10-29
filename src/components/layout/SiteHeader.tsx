/**
 * @file SiteHeader.tsx
 * @description The header for every screen that is not inside a signed-in app
 * layout: sign-in and register, error pages, onboarding, checkout, and the public
 * pages. It always offers a way home (the dashboard when signed in, the landing
 * page when not), the theme toggle, and who you are or how to sign in.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard } from 'lucide-react';
import { useCurrentRole, useIsAuthenticated } from '@/hooks/useAuthStore';
import { APP_NAME } from '@/lib/constants';
import { homePath } from '@/lib/home';
import { Button } from '@/components/ui';
import { ThemeToggle } from './ThemeToggle';

interface SiteHeaderProps {
  /** Extra links shown before the home button (e.g. the public pages' nav). */
  children?: ReactNode;
  /** Keep the header at the top while the page scrolls. */
  sticky?: boolean;
}

export function SiteHeader({ children, sticky = true }: SiteHeaderProps) {
  const isAuthenticated = useIsAuthenticated();
  const role = useCurrentRole();
  const home = isAuthenticated ? homePath(role) : '/';
  const HomeIcon = isAuthenticated ? LayoutDashboard : Home;

  return (
    <header
      className={`${sticky ? 'sticky top-0 ' : ''}z-sticky border-b border-slate-200 bg-background-light/90 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/90`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <Link to={home} className="font-display text-h3 text-slate-900 dark:text-slate-100">
          {APP_NAME}
        </Link>

        <nav aria-label="Site" className="flex items-center gap-1">
          {children}
          <Link to={home}>
            <Button variant="ghost" size="sm" leftIcon={HomeIcon}>
              {isAuthenticated ? 'Dashboard' : 'Home'}
            </Button>
          </Link>
          <ThemeToggle />
          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="primary" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
