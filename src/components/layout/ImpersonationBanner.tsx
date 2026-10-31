/**
 * @file ImpersonationBanner.tsx
 * @description Shown on every screen while a platform admin is inside a church's
 * account, so it is never mistaken for their own, with the time left and a way out.
 *
 * Mounted once in App.tsx, like OfflineBanner (so it sits outside the router's context
 * and navigates through the router object). The church's token cannot be
 * renewed, so when the countdown ends the session is ended here instead of the
 * next request failing with a confusing error.
 */
import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { router } from '@/routes';
import { useAuthStore } from '@/hooks/useAuthStore';
import { formatCountdown } from '@/lib/impersonation';
import { Button } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = { staff: 'staff', board: 'administrator', member: 'a member' };

export function ImpersonationBanner() {
  const session = useAuthStore((s) => s.session);
  const end = useAuthStore((s) => s.endImpersonation);
  const [now, setNow] = useState(() => Date.now());

  const active = Boolean(session?.isImpersonating);
  const expiresAt = session?.impersonationExpiresAt ?? 0;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const left = expiresAt - now;
  const expired = active && left <= 0;

  function leave() {
    end();
    void router.navigate('/platform/orgs');
  }

  useEffect(() => {
    if (expired) {
      end();
      void router.navigate('/platform/orgs');
    }
  }, [expired, end]);

  if (!active || !session) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-20 xl:bottom-4 z-[150] flex justify-center px-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-warning px-4 py-2 text-body-sm font-medium text-white shadow-lg">
        <Eye size={16} className="shrink-0" aria-hidden />
        <span className="min-w-0 truncate">
          Viewing {session.impersonatedOrgName} as{' '}
          {ROLE_LABEL[session.impersonatedRole ?? ''] ?? session.impersonatedRole} · {formatCountdown(left)} left
        </span>
        <Button variant="secondary" size="sm" onClick={leave} className="shrink-0">
          Exit
        </Button>
      </div>
    </div>
  );
}
