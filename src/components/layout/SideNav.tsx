/**
 * @file SideNav.tsx
 * @description Desktop sidebar navigation. Hidden below the lg breakpoint, where
 * NavDrawer takes over.
 *
 * Three fixed regions per the desktop inventory: brand lockup at the top, the
 * scrolling nav in the middle, and a footer carrying the signed-in user and the
 * one primary action for this surface.
 */
import { NavLink, Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Text } from '@/components/ui';

export interface NavSection {
  title?: string;
  items: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    badgeCount?: number;
  }>;
}

export interface SideNavUser {
  name: string;
  /** Role or tenant line under the name. */
  subtitle?: string;
  photoUrl?: string;
}

interface SideNavProps {
  sections: NavSection[];
  orgName?: string;
  /** Small caps line under the brand, e.g. the tenant or "Platform". */
  brandSubtitle?: string;
  user?: SideNavUser;
  /** The single primary action for this surface, pinned above the user. */
  primaryAction?: { label: string; href: string; icon: LucideIcon };
  variant?: 'default' | 'platform';
}

export function SideNav({
  sections,
  orgName,
  brandSubtitle,
  user,
  primaryAction,
  variant = 'default',
}: SideNavProps) {
  const isPlatform = variant === 'platform';

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-64 xl:w-72 h-screen sticky top-0 shrink-0 border-r',
        isPlatform
          ? 'bg-platform-bg border-slate-800'
          : 'bg-surface dark:bg-surface-dark border-slate-200 dark:border-slate-800',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'h-16 px-5 flex flex-col justify-center border-b shrink-0',
          isPlatform ? 'border-slate-800' : 'border-slate-200 dark:border-slate-800',
        )}
      >
        <Text variant="h3" className={cn('truncate leading-tight', isPlatform && 'text-white')}>
          {orgName ?? 'EcclesiaFlow'}
        </Text>
        {brandSubtitle && (
          <Text variant="label" className={cn(isPlatform ? 'text-platform-accent' : 'text-accent-gold')}>
            {brandSubtitle}
          </Text>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <Text variant="label" className="px-3 mb-1.5 text-slate-500">
                {section.title}
              </Text>
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href.split('/').length <= 2}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 rounded-lg transition-colors min-h-11',
                    isActive
                      ? isPlatform
                        ? 'bg-platform-accent text-white'
                        : 'bg-primary text-white'
                      : isPlatform
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <Text variant="body" className={cn('flex-1 truncate', isActive && 'font-medium')}>
                      {item.label}
                    </Text>
                    {!!item.badgeCount && (
                      <span className="bg-danger text-white text-caption font-bold px-1.5 py-0.5 rounded-full">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: the primary action, then who is signed in */}
      <div
        className={cn(
          'shrink-0 border-t p-3 space-y-3',
          isPlatform ? 'border-slate-800' : 'border-slate-200 dark:border-slate-800',
        )}
      >
        {primaryAction && (
          <Link
            to={primaryAction.href}
            className={cn(
              'flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-body transition-colors',
              isPlatform
                ? 'bg-platform-accent text-white hover:bg-indigo-500'
                : 'bg-primary text-white hover:bg-primary-hover',
            )}
          >
            <primaryAction.icon size={18} aria-hidden />
            {primaryAction.label}
          </Link>
        )}

        {user && (
          <div className="flex items-center gap-3 px-1">
            <Avatar src={user.photoUrl} name={user.name} size="sm" className="shrink-0" />
            <div className="min-w-0">
              <Text
                variant="body-sm"
                className={cn('truncate font-medium', isPlatform && 'text-white')}
              >
                {user.name}
              </Text>
              {user.subtitle && (
                <Text variant="caption" className="truncate block text-slate-500">
                  {user.subtitle}
                </Text>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
