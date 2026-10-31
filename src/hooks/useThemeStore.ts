/**
 * @file useThemeStore.ts
 * @description Light, dark, or follow the device — one choice for the whole app.
 *
 * Tailwind runs in `darkMode: 'class'`, so dark mode is the `dark` class on
 * <html>. The inline script in index.html sets it before first paint (no flash
 * of the wrong theme); this store keeps it right afterwards: it applies a
 * changed choice, and re-applies when the device's own setting changes while
 * the choice is "system".
 *
 * The choice is per browser, not per account: a shared tablet in a church
 * office should not flip theme with whoever signs in.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

/** localStorage key, also read by the inline script in index.html. */
export const THEME_STORAGE_KEY = 'ecclesia-theme';

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** light → dark → system → light, for a single toggle button. */
  cycle: () => void;
}

const NEXT: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'system', system: 'light' };

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      cycle: () => set({ preference: NEXT[get().preference] }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

export function applyTheme(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved; // native form controls and scrollbars follow
}

/** Call once at start-up. Returns a cleanup for tests. */
export function initTheme(): () => void {
  applyTheme(useThemeStore.getState().preference);
  const unsubscribe = useThemeStore.subscribe((state) => applyTheme(state.preference));
  const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  const onDeviceChange = () => applyTheme(useThemeStore.getState().preference);
  media?.addEventListener('change', onDeviceChange);
  return () => {
    unsubscribe();
    media?.removeEventListener('change', onDeviceChange);
  };
}
