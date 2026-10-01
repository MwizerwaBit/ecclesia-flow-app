/**
 * @file PageHeader.tsx
 * @description A screen's title, its one-line explanation, and its actions.
 *
 * Stacks on a phone, where a title and a button cannot share a line. Becomes a
 * row from lg up, which is where the desktop inventory puts screen actions —
 * beside the heading rather than in a floating button at the corner of the page.
 */
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons for this screen. Hidden on mobile when the screen uses a FAB. */
  actions?: ReactNode;
  /** Keeps actions visible on mobile too, for screens with no FAB. */
  actionsOnMobile?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  actionsOnMobile = false,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col lg:flex-row lg:items-start lg:gap-6 mb-5', className)}>
      <div className="min-w-0 flex-1">
        <Text variant="h1" className="mb-1">
          {title}
        </Text>
        {description && (
          <Text variant="body" color="muted">
            {description}
          </Text>
        )}
      </div>

      {actions && (
        <div
          className={cn(
            'shrink-0 items-center gap-2 mt-4 lg:mt-0',
            actionsOnMobile ? 'flex' : 'hidden lg:flex',
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
