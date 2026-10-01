/**
 * @file Fab.tsx
 * @description Floating action button — one per screen, for that screen's single primary action.
 *
 * Sits above the bottom tab bar on mobile and grows a text label from tablet width up.
 *
 * @example
 * <Fab icon={Plus} label="Add Member" onClick={() => setSheetOpen(true)} />
 */
import { type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FabProps extends ComponentPropsWithoutRef<'button'> {
  icon: LucideIcon;
  /** Accessible name; also shown as text from tablet width up. */
  label: string;
  /** Lift the FAB clear of the bottom tab bar. Default true. */
  aboveTabBar?: boolean;
}

export const Fab = forwardRef<HTMLButtonElement, FabProps>(
  ({ icon: Icon, label, aboveTabBar = true, className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'fixed right-4 z-sticky flex items-center gap-2',
        'h-14 px-4 rounded-full bg-primary text-white shadow-fab',
        'hover:bg-primary-hover active:scale-95 transition-all duration-fast',
        'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        aboveTabBar ? 'bottom-24 lg:bottom-8' : 'bottom-8',
        className
      )}
      {...props}
    >
      <Icon size={24} aria-hidden />
      <span className="hidden lg:inline text-body font-medium pr-1">{label}</span>
    </button>
  )
);

Fab.displayName = 'Fab';
