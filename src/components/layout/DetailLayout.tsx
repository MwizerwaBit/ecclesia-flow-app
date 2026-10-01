/**
 * @file DetailLayout.tsx
 * @description A record's screen: hero across the top, then the record itself
 * beside the facts about it.
 *
 * On a phone everything is one column in reading order — hero, main, aside — so
 * nothing is lost, it is just further down. From lg up the aside moves beside
 * the main content and sticks while the main column scrolls, which is what the
 * desktop inventory does with contact details, family and emergency info.
 */
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DetailLayoutProps {
  /** Full-width block above the split: photo, name, status, primary actions. */
  hero?: ReactNode;
  /** Full-width row between hero and split, for stat tiles. */
  stats?: ReactNode;
  main: ReactNode;
  /** Secondary facts. Follows main on a phone, sits beside it on desktop. */
  aside?: ReactNode;
  className?: string;
}

export function DetailLayout({ hero, stats, main, aside, className }: DetailLayoutProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {hero}
      {stats}

      <div className={cn('grid gap-5', aside && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <div className="min-w-0 space-y-5">{main}</div>

        {aside && (
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">{aside}</aside>
        )}
      </div>
    </div>
  );
}
