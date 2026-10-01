/**
 * @file TopBar.tsx
 * @description The desktop header strip: where you are, what you can search,
 * and the one action this screen is for.
 *
 * The mobile TopHeader is a title and a menu button because there is no room for
 * anything else. From lg up there is room, so the primary action moves out of the
 * floating button and into the bar where desktop users look for it.
 */
import { type ReactNode } from 'react';
import { Bell, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Input, Text } from '@/components/ui';

interface TopBarProps {
  /** Usually omitted: screens carry their own heading via PageHeader, and two
   *  titles on one screen is one too many. Set it where the bar is the heading. */
  title?: string;
  subtitle?: string;
  /** Renders a search field in the bar when provided. */
  search?: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
  };
  /** Buttons for this screen — the primary one last, as on the mockups. */
  actions?: ReactNode;
  user?: { name: string; photoUrl?: string; subtitle?: string };
  notificationCount?: number;
  variant?: 'default' | 'platform';
  className?: string;
}

export function TopBar({
  title,
  subtitle,
  search,
  actions,
  user,
  notificationCount,
  variant = 'default',
  className,
}: TopBarProps) {
  const isPlatform = variant === 'platform';

  return (
    <header
      className={cn(
        'hidden lg:flex sticky top-0 z-sticky items-center gap-4 border-b px-6 py-3',
        isPlatform
          ? 'bg-platform-bg/90 border-slate-800'
          : 'bg-background-light/90 dark:bg-background-dark/90 border-slate-200 dark:border-slate-800',
        'backdrop-blur-md',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <>
            <Text variant="h2" className={cn('truncate leading-tight', isPlatform && 'text-white')}>
              {title}
            </Text>
            {subtitle && (
              <Text variant="body-sm" color="muted" className="truncate">
                {subtitle}
              </Text>
            )}
          </>
        )}
      </div>

      {search && (
        <div className="w-72 xl:w-96 shrink-0">
          <Input
            type="search"
            leftIcon={Search}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
      )}

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

      <div className="flex items-center gap-3 shrink-0 border-l border-slate-200 dark:border-slate-800 pl-4">
        <button
          type="button"
          aria-label={
            notificationCount ? `${notificationCount} unread notifications` : 'Notifications'
          }
          className={cn(
            'relative grid size-11 place-items-center rounded-lg transition-colors',
            isPlatform
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <Bell size={19} />
          {!!notificationCount && (
            <span className="absolute right-2 top-2 size-2 rounded-full bg-danger" />
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <Text
                variant="body-sm"
                className={cn('font-medium leading-tight', isPlatform && 'text-white')}
              >
                {user.name}
              </Text>
              {user.subtitle && (
                <Text variant="label" className="text-accent-gold">
                  {user.subtitle}
                </Text>
              )}
            </div>
            <Avatar src={user.photoUrl} name={user.name} size="sm" />
          </div>
        )}
      </div>
    </header>
  );
}
