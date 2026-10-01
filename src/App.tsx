/**
 * @file App.tsx
 * @description Root component. Provides global context providers and mounts the router.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <DevRoleSwitcher />
    </QueryClientProvider>
  );
}
