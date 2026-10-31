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
import { SiteHeader } from '@/components/layout';
import { Button } from '@/components/ui';

export function MarketingLayout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <SiteHeader>
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
      </SiteHeader>

      <Outlet />
    </div>
  );
}
