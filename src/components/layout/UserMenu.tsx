/**
 * @file UserMenu.tsx
 * @description The signed-in person, as something you can press: their profile
 * and sign out.
 *
 * Every dashboard (staff, board, platform, member) shows who is signed in, and
 * until now none of those was clickable and only the member profile page had a
 * way out. This is that, in one place, so each layout offers the same thing:
 *   - UserMenu: a button with a dropdown. Desktop top bar, sidebar footer and
 *     the phone header all use it.
 *   - UserMenuLinks: the same two actions as a plain list, for the phone's
 *     slide-in menu where a dropdown inside a drawer would be awkward.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, CircleHelp, LogOut, UserRound } from 'lucide-react';
import { useSignOut } from '@/hooks/useSignOut';
import { useGuideStore } from '@/hooks/useGuideStore';
import { guideFor } from '@/lib/guides';
import { cn } from '@/lib/cn';
import { Avatar, Text } from '@/components/ui';

export interface UserMenuUser {
  name: string;
  /** Church or role line under the name. */
  subtitle?: string;
  photoUrl?: string;
}

interface Destinations {
  /** The screen "My profile" opens. */
  profileHref: string;
  /** Where to land after signing out. */
  loginPath?: string;
}

interface UserMenuProps extends Destinations {
  user: UserMenuUser;
  /** Dark chrome for the platform admin surface. */
  variant?: 'default' | 'platform';
  /** `avatar`: just the picture (phones). `full`: picture, name and a caret. */
  display?: 'avatar' | 'full';
  /** Which way the menu opens; the sidebar footer opens upward. */
  placement?: 'bottom-end' | 'top-start';
  className?: string;
}

export function UserMenu({
  user,
  profileHref,
  loginPath,
  variant = 'default',
  display = 'full',
  placement = 'bottom-end',
  className,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { signOut, pending } = useSignOut(loginPath);
  const isPlatform = variant === 'platform';
  const hasGuide = Boolean(guideFor(useLocation().pathname));
  const replayGuide = useGuideStore((s) => s.replay);

  // Close on Escape or a click away; choosing an item closes it directly.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass = cn(
    'flex w-full items-center gap-3 rounded-lg px-3 min-h-11 text-left text-body transition-colors',
    isPlatform ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  );

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={display === 'avatar' ? `Account menu for ${user.name}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2.5 rounded-lg text-left transition-colors',
          display === 'avatar' ? 'p-1 rounded-full' : 'px-2 py-1.5 min-h-11 w-full',
          isPlatform ? 'hover:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
      >
        <Avatar src={user.photoUrl} name={user.name} size="sm" className="shrink-0" />
        {display === 'full' && (
          <>
            <span className="min-w-0 flex-1">
              <Text variant="body-sm" className={cn('truncate font-medium leading-tight', isPlatform && 'text-white')}>
                {user.name}
              </Text>
              {user.subtitle && (
                <Text variant="caption" className="block truncate text-slate-500">
                  {user.subtitle}
                </Text>
              )}
            </span>
            <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className={cn(
            'absolute z-dropdown w-64 rounded-xl border p-1.5 shadow-lg animate-fade-in',
            placement === 'bottom-end' ? 'right-0 top-full mt-2' : 'left-0 bottom-full mb-2',
            isPlatform
              ? 'bg-platform-bg border-slate-700'
              : 'bg-surface dark:bg-surface-dark border-slate-200 dark:border-slate-700',
          )}
        >
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 mb-1.5">
            <Text variant="body-sm" className={cn('truncate font-medium', isPlatform && 'text-white')}>
              {user.name}
            </Text>
            {user.subtitle && (
              <Text variant="caption" className="block truncate text-slate-500">
                {user.subtitle}
              </Text>
            )}
          </div>

          <Link to={profileHref} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <UserRound size={18} className="shrink-0 text-slate-400" aria-hidden />
            My profile
          </Link>
          {hasGuide && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                replayGuide();
              }}
              className={itemClass}
            >
              <CircleHelp size={18} className="shrink-0 text-slate-400" aria-hidden />
              Guide for this page
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={pending}
            className={cn(itemClass, 'text-danger hover:bg-danger-light/60 dark:text-danger disabled:opacity-60')}
          >
            <LogOut size={18} className="shrink-0" aria-hidden />
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

/** The same two actions as a plain list, for the phone's slide-in menu. */
export function UserMenuLinks({
  user,
  profileHref,
  loginPath,
  variant = 'default',
  onNavigate,
}: Destinations & { user: UserMenuUser; variant?: 'default' | 'platform'; onNavigate?: () => void }) {
  const { signOut, pending } = useSignOut(loginPath);
  const isPlatform = variant === 'platform';
  const hasGuide = Boolean(guideFor(useLocation().pathname));
  const replayGuide = useGuideStore((s) => s.replay);
  const row = cn(
    'flex w-full items-center gap-3 rounded-lg px-3 min-h-11 text-left text-body transition-colors',
    isPlatform ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  );

  return (
    <div className={cn('shrink-0 border-t p-3 pb-safe space-y-1', isPlatform ? 'border-slate-700' : 'border-slate-200 dark:border-slate-800')}>
      <Link to={profileHref} onClick={onNavigate} className={cn(row, 'gap-3')}>
        <Avatar src={user.photoUrl} name={user.name} size="sm" className="shrink-0" />
        <span className="min-w-0">
          <Text variant="body-sm" className={cn('truncate font-medium', isPlatform && 'text-white')}>
            {user.name}
          </Text>
          <Text variant="caption" className="block truncate text-slate-500">
            My profile
          </Text>
        </span>
      </Link>
      {hasGuide && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            replayGuide();
          }}
          className={row}
        >
          <CircleHelp size={18} className="shrink-0 text-slate-400" aria-hidden />
          Guide for this page
        </button>
      )}
      <button type="button" onClick={signOut} disabled={pending} className={cn(row, 'text-danger dark:text-danger disabled:opacity-60')}>
        <LogOut size={18} className="shrink-0" aria-hidden />
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
