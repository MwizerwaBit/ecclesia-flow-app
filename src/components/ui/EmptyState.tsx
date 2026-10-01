/**
 * @file EmptyState.tsx
 * @description The "nothing here yet" state — encouraging, never a dead end.
 *
 * Every list screen uses this instead of rendering blank space, so a new church
 * always sees a next step rather than an empty page.
 *
 * @example
 * <EmptyState
 *   icon={Users}
 *   title="No members yet"
 *   description="Your congregation starts here."
 *   action={<Button leftIcon={Plus}>Add your first member</Button>}
 * />
 */
import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Text } from './Typography';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 py-12', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
        <Icon size={26} className="text-primary" aria-hidden />
      </div>
      <Text variant="h3" className="mb-1">
        {title}
      </Text>
      {description && (
        <Text variant="body" color="muted" className="max-w-xs">
          {description}
        </Text>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
