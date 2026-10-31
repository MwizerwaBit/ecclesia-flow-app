/**
 * @file DayPanel.tsx
 * @description One day's events in a sheet: what opens when a day is tapped in
 * the month grid. Every event is a real link, so it is also the keyboard and
 * screen-reader way into a day's events.
 *
 * Props contract
 *   day        DayKey | null     the open day; null keeps the panel closed
 *   items      T[]               the window's occurrences (the panel picks the day's)
 *   zone       string            the church's IANA zone
 *   onClose    () => void
 *   hrefFor    (item) => string  makes each row a link
 *   action     ReactNode         pinned to the bottom, e.g. a "New gathering on this
 *                                day" button for staff. Omit for members and the public.
 *   emptyText  string            shown when the day has nothing (default "Nothing is scheduled.")
 */
import { useMemo, type ReactNode } from 'react';
import type { CalendarItem } from '@/types';
import { formatDay, groupByDay, type DayKey } from '@/lib/calendar';
import { BottomSheet, Text } from '@/components/ui';
import { AgendaRow } from './EventChip';
import { countLabel } from './calendarState';

interface DayPanelProps<T extends CalendarItem> {
  day: DayKey | null;
  items: T[];
  zone: string;
  onClose: () => void;
  hrefFor?: (item: T) => string;
  action?: ReactNode;
  emptyText?: string;
}

export function DayPanel<T extends CalendarItem>({
  day,
  items,
  zone,
  onClose,
  hrefFor,
  action,
  emptyText = 'Nothing is scheduled.',
}: DayPanelProps<T>) {
  const dayItems = useMemo(() => (day ? (groupByDay(items, zone).get(day) ?? []) : []), [day, items, zone]);
  if (!day) return null;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
      description={countLabel(dayItems.length)}
      footer={action}
    >
      {dayItems.length === 0 ? (
        <Text variant="body" color="muted" className="py-6 text-center">
          {emptyText}
        </Text>
      ) : (
        <ul className="space-y-2">
          {dayItems.map((item, i) => (
            <li key={`${item.eventId}-${item.occurrenceStart}-${i}`}>
              <AgendaRow item={item} day={day} zone={zone} href={hrefFor?.(item)} />
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
