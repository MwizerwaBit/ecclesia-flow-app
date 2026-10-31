/**
 * @file ThemeToggle.tsx
 * @description One button that cycles light → dark → follow the device.
 *
 * Used in every header (public, auth, error and signed-in), so the choice is
 * always one tap away and works the same everywhere. The label says what the
 * next press does, not the current state, which is what a screen reader needs.
 */
import { Monitor, Moon, Sun } from 'lucide-react';
import { type ThemePreference, useThemeStore } from '@/hooks/useThemeStore';
import { cn } from '@/lib/cn';

const LABELS: Record<ThemePreference, { now: string; next: string }> = {
  light: { now: 'Light', next: 'dark' },
  dark: { now: 'Dark', next: 'match your device' },
  system: { now: 'Matches your device', next: 'light' },
};

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemeStore((s) => s.preference);
  const cycle = useThemeStore((s) => s.cycle);
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  const label = `Theme: ${LABELS[preference].now}. Switch to ${LABELS[preference].next}`;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        className,
      )}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}
