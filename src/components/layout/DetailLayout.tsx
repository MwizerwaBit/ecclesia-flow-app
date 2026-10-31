/**
 * @file DetailLayout.tsx
 * @description A record's screen: hero across the top, then the record itself
 * beside the facts about it.
 *
 * On a phone everything is one column in reading order — hero, main, aside — so
 * nothing is lost, it is just further down. From lg up (or from xl, see
 * `splitFrom`) the aside moves beside the main content and sticks while the main
 * column scrolls, which is what the desktop inventory does with contact details,
 * family and emergency info.
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
  /**
   * The breakpoint where the aside moves beside main. Default 'lg'. A screen with
   * a wide sidebar and fixed-height buttons in its aside passes 'xl': at lg the
   * staff sidebar leaves the aside only ~150px.
   */
  splitFrom?: 'lg' | 'xl';
  className?: string;
}

// Tailwind only sees whole class names, so each breakpoint is spelled out.
const SPLIT = {
  lg: { grid: 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]', aside: 'lg:sticky lg:top-24 lg:self-start' },
  xl: { grid: 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]', aside: 'xl:sticky xl:top-24 xl:self-start' },
} as const;

export function DetailLayout({ hero, stats, main, aside, splitFrom = 'lg', className }: DetailLayoutProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {hero}
      {stats}

      <div className={cn('grid gap-5', aside && SPLIT[splitFrom].grid)}>
        <div className="min-w-0 space-y-5">{main}</div>

        {aside && (
          <aside className={cn('min-w-0 space-y-5', SPLIT[splitFrom].aside)}>{aside}</aside>
        )}
      </div>
    </div>
  );
}
