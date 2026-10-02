/**
 * @file OfflineBanner.tsx
 * @description Global connectivity indicator — mounted once (in App.tsx), floats
 * above every screen regardless of which layout (staff/member/board/platform/
 * public) is active, so there's exactly one copy to keep in sync rather than
 * one per layout.
 *
 * Offline-first UX per the architecture brief's "Offline Screen" spec: cached
 * data stays on screen (the app doesn't redirect anywhere), and this pill is
 * the "sync indicator when reconnected" — it appears while offline, then
 * flips to a brief confirmation on reconnect instead of silently vanishing.
 */
import { useEffect, useState } from 'react';
import { useMutationState } from '@tanstack/react-query';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

const RECONNECTED_DISPLAY_MS = 3000;

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [showReconnected, setShowReconnected] = useState(false);

  // React Query pauses (rather than fails) a mutation started while offline
  // and fires it the moment `online` is reported — true for every
  // useMutation in this app already, with no per-screen code (verified live:
  // donation entry submitted offline sits paused, then completes and the
  // batch total updates the instant connectivity returns). This just makes
  // that queue visible instead of leaving a spinner with no explanation.
  const pendingSyncCount = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.state.isPaused,
  }).filter(Boolean).length;

  // Listeners own the state transitions directly (including the reconnect
  // timer) rather than a separate effect reacting to `isOnline` after the
  // fact — the state update happens right in the event that caused it, the
  // same way a click handler would, just for a browser event instead of a
  // DOM one.
  useEffect(() => {
    let reconnectTimer: number | undefined;

    const goOffline = () => {
      window.clearTimeout(reconnectTimer);
      setShowReconnected(false);
      setIsOnline(false);
    };
    const goOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      reconnectTimer = window.setTimeout(() => setShowReconnected(false), RECONNECTED_DISPLAY_MS);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.clearTimeout(reconnectTimer);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[150] flex justify-center pt-safe pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-auto mt-2 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg',
          'text-body-sm font-medium animate-fade-in',
          isOnline ? 'bg-success text-white' : 'bg-warning text-white',
        )}
      >
        {isOnline ? (
          <>
            <RefreshCw size={16} className="shrink-0" aria-hidden />
            <span>Back online — your data is up to date</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="shrink-0" aria-hidden />
            <span>
              You&rsquo;re offline — showing saved data
              {pendingSyncCount > 0 &&
                ` · ${pendingSyncCount} ${pendingSyncCount === 1 ? 'change' : 'changes'} waiting to sync`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
