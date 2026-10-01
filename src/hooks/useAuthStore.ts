/**
 * @file useAuthStore.ts
 * @description Zustand store for authentication state.
 * The single source of truth for the current user session across the app.
 *
 * Usage:
 *   const { session, login, logout } = useAuthStore();
 *   const user = useAuthStore(s => s.session?.user);
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, LoginCredentials } from '@/types';
import { authService } from '@/services/authService';

interface AuthStore {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setSession: (session: AuthSession) => void;
  clearError: () => void;

  // Impersonation
  startImpersonation: (session: AuthSession) => void;
  endImpersonation: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const session = await authService.login(credentials);
          set({ session, isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          throw err;
        }
      },

      logout: () => {
        set({ session: null, error: null });
      },

      setSession: (session) => set({ session }),

      clearError: () => set({ error: null }),

      startImpersonation: (session) => set({ session }),

      endImpersonation: () => {
        const current = get().session;
        if (current?.isImpersonating) {
          // Restore original session — in real impl, use stored original token
          set({ session: { ...current, isImpersonating: false } });
        }
      },
    }),
    {
      name: 'ecclesia-auth',
      // Only persist the session, not loading/error state
      partialize: (state) => ({ session: state.session }),
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

/** Returns the current authenticated user, or null */
export const useCurrentUser = () => useAuthStore((s) => s.session?.user ?? null);

/** Returns true if the user is currently authenticated */
export const useIsAuthenticated = () => useAuthStore((s) => s.session !== null);

/** Returns the current user's role */
export const useCurrentRole = () => useAuthStore((s) => s.session?.user.role ?? null);

/** Returns true if currently in an impersonation session */
export const useIsImpersonating = () =>
  useAuthStore((s) => s.session?.isImpersonating ?? false);
