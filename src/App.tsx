/**
 * @file App.tsx
 * @description Root component. Provides global context providers and mounts the router.
 */
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { useAuthStore } from '@/hooks/useAuthStore';
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher';
import { OfflineBanner } from '@/components/ui';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Kept well past staleTime so a screen opened offline still renders its
      // last-known data instead of an empty/loading state — "cached data
      // still visible" is the whole point of the offline banner above it.
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
});

// Persists the query cache to localStorage so a reload while offline (or a
// cold app open with no network yet) restores whatever was last fetched,
// rather than starting from an empty cache. Safe for this app's data: none
// of it is more sensitive at rest than what already sits in localStorage via
// the zustand auth store, and nothing here is written back without a live
// request succeeding first (the persister only mirrors reads).
const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'ecclesiaflow-query-cache',
});

// The cache is keyed by screen, not by church, so one church's directory must
// never be shown to the next person who signs in. Dropping it whenever the
// signed-in user or church changes keeps tenants apart on a shared device.
useAuthStore.subscribe((state, previous) => {
  const now = state.session?.user;
  const before = previous.session?.user;
  if (now?.id !== before?.id || now?.tenantId !== before?.tenantId) queryClient.clear();
});

function cacheOwner(): string {
  const user = useAuthStore.getState().session?.user;
  return user ? `${user.id}:${user.tenantId}` : 'signed-out';
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Dev-only inspection hook — lets the browser console (or a Puppeteer
  // script) check `window.__queryClient.getMutationCache().getAll()` to see
  // paused/pending mutations while testing offline behavior.
  (window as unknown as { __queryClient: QueryClient }).__queryClient = queryClient;
}

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      // The buster ties a persisted cache to the user and church that wrote it:
      // restoring one written under a different session discards it instead.
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: cacheOwner() }}
    >
      <OfflineBanner />
      <RouterProvider router={router} />
      <DevRoleSwitcher />
    </PersistQueryClientProvider>
  );
}
