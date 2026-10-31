/**
 * @file eventOccurrence.ts
 * @description One dated appearance of a gathering, worked out from the event
 * itself, for screens that show a single event (the member detail page).
 *
 * A repeating event's own start is its first date, often long past; what a
 * person wants is the next one. The occurrence keeps the series' length, so the
 * end moves with the start.
 */
import type { ChurchEvent } from '@/types';
import { addDays, dayKeyInZone, occurrenceDays, startOfDay } from '@/lib/calendar';

export interface EventOccurrence {
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isAllDay: boolean;
}

type EventTimes = Pick<ChurchEvent, 'startDateTime' | 'endDateTime' | 'isAllDay'>;

/** The fields a list row needs to be dated and ordered. */
interface DatedEvent {
  startDateTime: string;
  nextOccurrence?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

/** When a list row happens next: a repeating event's next date, else its own start. */
export function eventWhen(event: DatedEvent): string {
  return event.nextOccurrence ?? event.startDateTime;
}

/**
 * An "upcoming" list as people expect it: soonest next date first, and without repeating
 * events that have run out of dates (their series start is long past and means nothing).
 */
export function upcomingByDate<T extends DatedEvent>(events: T[]): T[] {
  return events
    .filter((e) => !((e.isRecurring || e.recurrenceRule) && !e.nextOccurrence))
    .sort((a, b) => new Date(eventWhen(a)).getTime() - new Date(eventWhen(b)).getTime());
}

/** The event as it falls on the occurrence that starts at `start`, in the church's zone. */
export function occurrenceAt(event: EventTimes, start: string, zone: string): EventOccurrence {
  const isAllDay = Boolean(event.isAllDay);
  const first = { occurrenceStart: event.startDateTime, occurrenceEnd: event.endDateTime ?? null, isAllDay };
  if (!event.endDateTime) return { ...first, occurrenceStart: start };
  if (start === event.startDateTime) return first;

  if (isAllDay) {
    // Whole days: count them in the church's zone so a clock change cannot add one.
    const length = occurrenceDays(first, zone).length;
    const end = startOfDay(addDays(dayKeyInZone(start, zone), length), zone).toISOString();
    return { occurrenceStart: start, occurrenceEnd: end, isAllDay };
  }
  const duration = new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime();
  return { occurrenceStart: start, occurrenceEnd: new Date(new Date(start).getTime() + duration).toISOString(), isAllDay };
}

/**
 * The next occurrence of the event: the server's `nextOccurrence`, else the first of
 * `upcomingOccurrences`, else the event's own date when it does not repeat. A repeating
 * event with no next date (the series has ended, or the next one is out of range) has
 * none, so this returns null rather than presenting the series' first date as the next.
 */
export function nextOccurrence(
  event: EventTimes & Partial<Pick<ChurchEvent, 'upcomingOccurrences' | 'nextOccurrence' | 'isRecurring' | 'recurrenceRule'>>,
  zone: string,
): EventOccurrence | null {
  const next = event.nextOccurrence ?? event.upcomingOccurrences?.[0];
  if (next) return occurrenceAt(event, next, zone);
  if (event.isRecurring || event.recurrenceRule) return null;
  return occurrenceAt(event, event.startDateTime, zone);
}
