/**
 * @file useOnlineStatus.ts
 * @description Live connectivity state via the browser's online/offline events.
 *
 * `navigator.onLine` only tells you "this device has *a* network interface
 * that's up" — not that the app's own requests actually succeed — but for a
 * mock-backed app with no real network calls yet, it's the honest signal we
 * have, and it's what every real browser already fires `online`/`offline`
 * events for. Swapping in a real reachability ping (e.g. a HEAD request to
 * the API) later is a one-line change inside this hook, not a call-site change.
 */
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}
