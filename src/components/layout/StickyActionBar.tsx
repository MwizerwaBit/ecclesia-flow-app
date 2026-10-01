/**
 * @file StickyActionBar.tsx
 * @description Fixed bottom action bar for screens that need a persistent
 * total/submit area (donation entry, bulk issue, etc.).
 *
 * On phones the mobile BottomTabBar already owns the true viewport bottom,
 * so this bar floats directly above it instead of stacking on the same
 * `bottom-0` edge, which used to hide the tab bar behind the action bar
 * (or vice versa) on every screen that had both. On `lg+` the tab bar is
 * hidden, so the bar drops back down to the screen edge.
 *
 * `offsetSidebar` starts the bar to the right of SideNav's `lg:w-64 xl:w-72`
 * instead of running edge-to-edge, since `fixed` ignores the flex layout and
 * would otherwise draw over the sidebar's own lower nav items. Only pass
 * `false` from a layout that has no desktop sidebar (e.g. the member portal).
 */
import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

interface StickyActionBarProps extends ComponentPropsWithoutRef<'div'> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  contentClassName?: string;
  offsetSidebar?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-md mx-auto',
  md: 'max-w-2xl mx-auto',
  lg: 'max-w-5xl mx-auto',
  xl: 'max-w-7xl mx-auto',
  full: 'w-full',
};

export function StickyActionBar({
  maxWidth = 'md',
  className,
  contentClassName,
  offsetSidebar = true,
  children,
  ...props
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 z-sticky border-t border-slate-200 dark:border-slate-800',
        'bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-md px-4 py-4',
        'bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-safe',
        offsetSidebar && 'lg:left-64 xl:left-72',
        className,
      )}
      {...props}
    >
      <div className={cn(maxWidthClasses[maxWidth], contentClassName)}>{children}</div>
    </div>
  );
}
