/**
 * @file useAuthStore.ts
 * @description Zustand store for authentication state.
 * The single source of truth for the current user session across the app.
 *
 * What is stored where (REST mode):
 *   - The signed-in profile (name, role, church, permissions for showing and
 *     hiding UI) is persisted so a reload doesn't flash the login screen.
 *     It is display state only — the API re-checks every permission itself.
 *   - The access token is NOT persisted; it lives in the HTTP client's memory
 *     (services/adapter.ts). After a reload the first API call silently
 *     rotates the httpOnly refresh cookie to get a new one.
 *   - The refresh token is never visible to JavaScript at all.
 *
 * Usage:
 *   const { session, login, logout } = useAuthStore();
 *   const user = useAuthStore(s => s.session?.user);
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, LoginCredentials } from '@/types';
import { authService } from '@/services/authService';
import { API_MODE, ApiError, refreshAccessToken, registerAuthHandlers, setAccessToken } from '@/services/adapter';

interface AuthStore {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  /** Set when sign-in passed the password and now needs the second factor. Memory only. */
  mfaChallengeToken: string | null;

  // Actions
  /** Resolves 'mfa' when a code is still needed, 'signed-in' otherwise. */
  login: (credentials: LoginCredentials) => Promise<'signed-in' | 'mfa'>;
  completeMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  /** Drops local session state without calling the server (used when the server already ended it). */
  clearLocalSession: () => void;
  clearError: () => void;

  // Impersonation
  startImpersonation: (session: AuthSession) => void;
  endImpersonation: () => void;
}

/** Friendly copy for the server's machine-readable auth error codes. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'account_locked') {
      const until = err.lockedUntil ? new Date(err.lockedUntil) : null;
      return until
        ? `Too many failed attempts. For your safety this account is locked until ${until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        : 'Too many failed attempts. Try again in a little while.';
    }
    if (err.code === 'rate_limited') return 'Too many attempts from this device. Wait a minute and try again.';
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: false,
      error: null,
      mfaChallengeToken: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null, mfaChallengeToken: null });
        try {
          const result = await authService.login(credentials);
          if ('mfaRequired' in result) {
            set({ isLoading: false, mfaChallengeToken: result.challengeToken });
            return 'mfa';
          }
          set({ session: result, isLoading: false });
          return 'signed-in';
        } catch (err) {
          set({ isLoading: false, error: authErrorMessage(err) });
          throw err;
        }
      },

      completeMfa: async (code) => {
        const challenge = get().mfaChallengeToken;
        const session = await authService.verifyMfa(code, challenge ?? undefined);
        set({ session, mfaChallengeToken: null, error: null });
      },

      logout: async () => {
        set({ session: null, error: null, mfaChallengeToken: null });
        await authService.logout();
      },

      setSession: (session) => {
        setAccessToken(session.accessToken, session.expiresAt);
        set({ session });
      },

      clearLocalSession: () => {
        setAccessToken(null);
        set({ session: null, mfaChallengeToken: null });
      },

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
      // Only the session's display state is persisted — and in REST mode
      // never the access token (see the file header).
      partialize: (state) => ({
        session:
          state.session && API_MODE === 'rest' ? { ...state.session, accessToken: '' } : state.session,
      }),
    },
  ),
);

// The HTTP client asks the store to refresh or end the session; wiring it
// here (not in the client) keeps the dependency pointing one way.
if (API_MODE === 'rest') {
  registerAuthHandlers({
    refresh: async () => {
      // No profile on this device means no session to resume.
      if (!useAuthStore.getState().session) return false;
      try {
        const session = await authService.refresh();
        const previous = useAuthStore.getState().session;
        useAuthStore.setState({ session: { ...session, isImpersonating: previous?.isImpersonating } });
        return true;
      } catch {
        return false;
      }
    },
    expired: () => {
      const hadSession = Boolean(useAuthStore.getState().session);
      useAuthStore.getState().clearLocalSession();
      if (hadSession && window.location.pathname !== '/session-expired') {
        window.location.assign('/session-expired');
      }
    },
  });

  // A profile restored from storage is only a claim that a session existed.
  // Confirm it with the server at start-up, before cached screens are trusted:
  // if it was signed out elsewhere, revoked or suspended, end it now rather
  // than on whichever request happens to come first.
  if (useAuthStore.getState().session) {
    void refreshAccessToken().then((ok) => {
      if (!ok) {
        useAuthStore.getState().clearLocalSession();
        if (!['/login', '/session-expired'].includes(window.location.pathname)) {
          window.location.assign('/session-expired');
        }
      }
    });
  }
}

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
