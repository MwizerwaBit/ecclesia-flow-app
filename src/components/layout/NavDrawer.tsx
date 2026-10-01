/**
 * @file NavDrawer.tsx
 * @description The sidebar, as a slide-in panel for phones and tablets.
 *
 * SideNav is `hidden lg:flex`, so below 1024px every destination outside the
 * four bottom tabs had no way to be reached — the header's menu button was wired
 * to a console.log. This is that menu.
 *
 * Takes the same `sections` as SideNav so the two can never list different things.
 */
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui';
import type { NavSection } from './SideNav';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  sections: NavSection[];
  orgName?: string;
  /** Platform admin runs dark chrome so it is never mistaken for a tenant. */
  variant?: 'default' | 'platform';
}

export function NavDrawer({
  open,
  onClose,
  sections,
  orgName,
  variant = 'default',
}: NavDrawerProps) {
  // Escape to close, and hold the background still while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isPlatform = variant === 'platform';

  return (
    <div className="fixed inset-0 z-sheet lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] flex flex-col shadow-sheet',
          'animate-slide-up lg:animate-none',
          isPlatform
            ? 'bg-platform-bg text-white'
            : 'bg-surface dark:bg-surface-dark',
        )}
      >
        <div
          className={cn(
            'h-14 shrink-0 px-4 flex items-center justify-between border-b',
            isPlatform ? 'border-slate-700' : 'border-slate-200 dark:border-slate-800',
          )}
        >
          <Text variant="h3" className={cn('truncate', isPlatform && 'text-white')}>
            {orgName ?? 'EcclesiaFlow'}
          </Text>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={cn(
              'p-2 -mr-2 rounded-full transition-colors',
              isPlatform
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 pb-safe">
          {sections.map((section, i) => (
            <div key={i} className="flex flex-col gap-1">
              {section.title && (
                <Text
                  variant="label"
                  className={cn('px-3 mb-2', isPlatform ? 'text-slate-500' : 'text-slate-500')}
                >
                  {section.title}
                </Text>
              )}

              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href.split('/').length <= 2}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      // 44px minimum row height — this is the primary nav on touch.
                      'flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg transition-colors',
                      isActive
                        ? isPlatform
                          ? 'bg-platform-accent/20 text-white'
                          : 'bg-primary-light text-primary dark:bg-primary-muted dark:text-primary-light'
                        : isPlatform
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      <Text
                        variant="body"
                        className={cn('flex-1', isActive && 'font-bold', isPlatform && 'text-inherit')}
                      >
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
      </div>
    </div>
  );
}
