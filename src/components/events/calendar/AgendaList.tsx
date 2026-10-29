/**
 * @file AgendaList.tsx
 * @description Calendar items as a list grouped by day: only the days that have
 * something, each under a heading in the church's time zone.
 *
 * Props contract
 *   items         T[] (T extends CalendarItem)  the window's occurrences
 *   zone          string                the church's IANA zone
 *   range         { first, last }       optional: days outside it are not listed
 *                                       (a long multi-day item would otherwise repeat past the window)
 *   hrefFor       (item) => string      makes each row a link
 *   isLoading     boolean               first load: shows Skeleton rows
 *   error         unknown               a failed load: shows the message and a Retry button
 *   onRetry       () => void
 *   busy          boolean               dims the list while a new window loads; while
 *                                       it is also empty a Skeleton shows instead of the
 *                                       "nothing here" state, which would flash and be wrong
 *   stickyOffset  string = 'top-0'      Tailwind `top-*` class for the sticky day headings.
 *                                       A page that scrolls under a sticky site header
 *                                       (the public calendar: header h-14) passes 'top-14'
 *   emptyTitle / emptyDescription / emptyAction
 *                                       the "nothing here" state; the parent says what
 *                                       to do next (staff: "New gathering"; members: nothing)
 *
 * Multi-day items are listed under each day they cover and say "Continues" after
 * the first. Day headings stick to the top of the scroll area.
 */
import { useMemo, type ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import type { CalendarItem } from '@/types';
import { formatDay, groupByDay, todayKey, type DayKey } from '@/lib/calendar';
import { cn } from '@/lib/cn';
import { Badge, EmptyState, Text } from '@/components/ui';
import { AgendaRow } from './EventChip';
import { CalendarError, CalendarLoading } from './CalendarStates';

interface AgendaListProps<T extends CalendarItem> {
  items: T[];
  zone: string;
  range?: { first: DayKey; last: DayKey };
  hrefFor?: (item: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  busy?: boolean;
  stickyOffset?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function AgendaList<T extends CalendarItem>({
  items,
  zone,
  range,
  hrefFor,
  isLoading = false,
  error,
  onRetry,
  busy = false,
  stickyOffset = 'top-0',
  emptyTitle = 'Nothing scheduled',
  emptyDescription,
  emptyAction,
}: AgendaListProps<T>) {
  const today = todayKey(zone);
  const days = useMemo(() => {
    const byDay = groupByDay(items, zone);
    return [...byDay.entries()]
      .filter(([day]) => !range || (day >= range.first && day <= range.last))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }, [items, zone, range]);

  if (error) return <CalendarError error={error} onRetry={onRetry ?? (() => undefined)} />;
  if (isLoading) return <CalendarLoading view="agenda" />;

  if (days.length === 0) {
    // A window is still loading: "Nothing scheduled" would be wrong, and announced.
    if (busy) return <CalendarLoading view="agenda" />;
    return <EmptyState icon={CalendarDays} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div aria-busy={busy} className={cn('space-y-6 transition-opacity', busy && 'opacity-60')}>
      {days.map(([day, dayItems]) => (
        <section key={day} aria-labelledby={`agenda-${day}`}>
          <h3
            id={`agenda-${day}`}
            className={cn(
              'sticky z-raised mb-2 flex items-center gap-2 bg-background-light py-2 dark:bg-background-dark',
              stickyOffset,
            )}
          >
            <Text as="span" variant="label" className="font-bold">
              {formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {day === today && (
              <Badge variant="primary" size="sm">
                Today
              </Badge>
            )}
          </h3>
          <ul className="space-y-2">
            {dayItems.map((item, i) => (
              <li key={`${item.eventId}-${item.occurrenceStart}-${i}`}>
                <AgendaRow item={item} day={day} zone={zone} href={hrefFor?.(item)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
