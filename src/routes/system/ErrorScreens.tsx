/**
 * @file ErrorScreens.tsx
 * @description Common system and error screens.
 */
import { type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertOctagon, Clock, ShieldAlert, WifiOff } from 'lucide-react';
import { SiteHeader } from '@/components/layout';
import { useCurrentRole, useIsAuthenticated } from '@/hooks/useAuthStore';
import { homePath } from '@/lib/home';
import { Button, Card, Text } from '@/components/ui';

/** Every error screen keeps the site header, so there is always a way home and a theme toggle. */
function ErrorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-light dark:bg-background-dark">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-6 text-center">{children}</main>
    </div>
  );
}

/** The button that leads out of an error: the dashboard when signed in, the landing page when not. */
function HomeButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const isAuthenticated = useIsAuthenticated();
  const role = useCurrentRole();
  return (
    <Link to={isAuthenticated ? homePath(role) : '/'}>
      <Button variant={variant}>{isAuthenticated ? 'Go to your dashboard' : 'Go to the home page'}</Button>
    </Link>
  );
}

export function NotFound() {
  return (
    <ErrorShell>
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center gap-4">
        <div className="text-slate-400 mb-2">
          <AlertOctagon size={48} />
        </div>
        <Text variant="h2">Page Not Found</Text>
        <Text variant="body" color="muted">
          The page you are looking for doesn't exist or has been moved.
        </Text>
        <div className="mt-4">
          <HomeButton />
        </div>
      </Card>
    </ErrorShell>
  );
}

export function Forbidden() {
  return (
    <ErrorShell>
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center gap-4">
        <div className="text-danger mb-2">
          <ShieldAlert size={48} />
        </div>
        <Text variant="h2">Access Denied</Text>
        <Text variant="body" color="muted">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </Text>
        <div className="mt-4">
          <HomeButton variant="secondary" />
        </div>
      </Card>
    </ErrorShell>
  );
}

export function OfflineScreen() {
  return (
    <ErrorShell>
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center gap-4">
        <div className="text-slate-400 mb-2">
          <WifiOff size={48} />
        </div>
        <Text variant="h2">You are offline</Text>
        <Text variant="body" color="muted">
          Please check your internet connection and try again.
        </Text>
        <div className="mt-4">
          <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </Card>
    </ErrorShell>
  );
}

/**
 * 500 — something broke on our side. The error ID is the point: it is what
 * support needs to find the trace, and asking someone to describe a stack trace
 * from memory never works.
 */
export function ServerError() {
  // The reference comes from whatever failed, not from here — an id invented in
  // the browser matches no server-side trace and would waste a support call.
  const [searchParams] = useSearchParams();
  const errorId = searchParams.get('ref');

  return (
    <ErrorShell>
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center gap-3">
        <div className="text-danger mb-2">
          <AlertOctagon size={48} />
        </div>
        <Text variant="h2">Something went wrong on our end</Text>
        <Text variant="body" color="muted">
          This is not something you did. The team has been notified automatically.
        </Text>

        {errorId && (
          <>
            <code className="mt-2 rounded bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-body-sm text-slate-500">
              {errorId}
            </code>
            <Text variant="caption" color="muted">
              Quote this reference if you contact support.
            </Text>
          </>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <HomeButton variant="ghost" />
        </div>
      </Card>
    </ErrorShell>
  );
}

/**
 * A soft paywall. The data-is-safe promise leads, because the fear this screen
 * provokes is that a church has lost its records rather than its access.
 */
export function SubscriptionExpired() {
  return (
    <ErrorShell>
      <Card padding="lg" className="max-w-md w-full flex flex-col items-center gap-3">
        <div className="text-warning mb-2">
          <Clock size={48} />
        </div>
        <Text variant="h2">Your trial has ended</Text>
        <Text variant="body" color="muted">
          Every member, gift and register you have entered is safe and waiting. Choosing a plan
          brings it all straight back.
        </Text>

        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
          <Link to="/pricing">
            <Button variant="primary" fullWidth>
              Choose a plan
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="ghost" fullWidth>
              Talk to us first
            </Button>
          </Link>
        </div>

        <Text variant="caption" color="muted" className="mt-3">
          Your data is kept for 90 days. You can export all of it at any time.
        </Text>
      </Card>
    </ErrorShell>
  );
}
