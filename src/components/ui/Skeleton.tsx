/**
 * @file Skeleton.tsx
 * @description Pulsing placeholder block for content still loading.
 *
 * A shape, not a spinner — sized and laid out like the real content so the
 * screen doesn't jump once data arrives. Compose a few of these per screen
 * instead of a single "Loading…" line.
 *
 * @example
 * <Skeleton className="h-4 w-32" />
 * <Skeleton className="size-12 rounded-full" />
 */
import { type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)}
      aria-hidden
      {...props}
    />
  );
}
