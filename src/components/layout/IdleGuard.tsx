/**
 * @file IdleGuard.tsx
 * @description Signs a session out after a period with no activity, and warns a
 * minute before.
 *
 * The limit comes from the server with the session (app/core/session_policy.py):
 * a leader-side session uses the church's setting (15 minutes unless an
 * administrator changed it), a member gets an hour, a platform admin fifteen
 * minutes.
 *
 * "Activity" is a tap, key press, scroll or pointer move in ANY tab of this
 * browser: the last-activity time lives in localStorage, so a second tab cannot
 * keep a forgotten first tab alive, and an open tab that is being used keeps
 * every tab alive. It is a timestamp rather than a timer, so a laptop that slept
 * or a tab that was closed still signs out on return: the next check sees how
 * long it has really been.
 *
 * Signing out also revokes the refresh token on the server, so the session
 * cannot be resumed afterwards. (The browser enforces *when*; the server cannot
 * tell idle from busy, which is why the access token itself stays short-lived.)
 */
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { ACTIVITY_KEY, idleMinutesFor, msUntilSignOut } from '@/lib/idle';
import { Button } from '@/components/ui';

const CHECK_EVERY_MS = 5_000;
const WARN_BEFORE_MS = 60_000;
const WRITE_EVERY_MS = 2_000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

/** Same-tab copy, so the limit still holds if localStorage is blocked. */
let memoryActivity = Date.now();

function readActivity(): number {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeActivity(at: number | null): void {
  try {
    if (at === null) window.localStorage.removeItem(ACTIVITY_KEY);
    else window.localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    // Storage blocked: the in-memory fallback below still enforces the limit in this tab.
  }
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function IdleGuard() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const signedIn = session !== null;
  const minutes = session ? idleMinutesFor(session) : 0;
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!signedIn) {
      writeActivity(null); // the next sign-in starts a fresh clock
      memoryActivity = Date.now();
      return;
    }

    let lastWrite = 0;
    if (!readActivity()) {
      memoryActivity = Date.now();
      writeActivity(memoryActivity);
    }

    const lastActivity = () => Math.max(readActivity(), memoryActivity);

    const expire = () => {
      writeActivity(null);
      const done = () => window.location.assign(`/session-expired?reason=idle&minutes=${minutes}`);
      void logout().then(done, done);
    };

    const check = () => {
      const left = msUntilSignOut(minutes, lastActivity(), Date.now());
      if (left <= 0) expire();
      else setMsLeft(left <= WARN_BEFORE_MS ? left : null);
    };

    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_EVERY_MS) return;
      lastWrite = now;
      memoryActivity = now;
      writeActivity(now);
      setMsLeft(null);
    };

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, touch, { passive: true, capture: true });
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    check(); // a persisted session that was idle while the tab was closed ends right away

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, touch, { capture: true });
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [signedIn, minutes, logout]);

  if (!signedIn || msLeft === null) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Signing out soon"
      className="fixed inset-x-4 bottom-4 z-toast mx-auto flex max-w-md items-center gap-3 rounded-xl border border-warning/40 bg-surface p-4 shadow-lg dark:bg-surface-dark"
    >
      <Clock size={22} className="shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 text-body-sm">
        You will be signed out in <strong className="tabular-nums">{clock(msLeft)}</strong> because there has been no
        activity.
      </p>
      <Button
        size="sm"
        onClick={() => {
          memoryActivity = Date.now();
          writeActivity(memoryActivity);
          setMsLeft(null);
        }}
      >
        Stay signed in
      </Button>
    </div>
  );
}
