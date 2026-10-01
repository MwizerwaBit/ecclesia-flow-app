/**
 * @file BottomTabBar.tsx
 * @description Mobile-first bottom navigation. Hidden on desktop (lg breakpoint).
 */
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui';

export interface TabItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface BottomTabBarProps {
  items: TabItem[];
}

export function BottomTabBar({ items }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-sticky bg-surface dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 pb-safe lg:hidden">
      <div className="flex h-16">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/portal' || item.href === '/staff/dashboard'}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-1 relative',
              'transition-colors duration-fast',
              isActive 
                ? 'text-primary dark:text-primary-light' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon 
                    size={24} 
                    className={cn('transition-transform duration-fast', isActive && 'scale-110')} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  {!!item.badgeCount && (
                    <span className="absolute -top-1 -right-2 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </span>
                  )}
                </div>
                <Text variant="caption" className={cn(isActive && 'font-bold')}>{item.label}</Text>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
