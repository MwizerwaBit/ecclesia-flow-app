/**
 * @file calendarLinks.ts
 * @description "Add to my calendar" links, built from a gathering's real times.
 *
 * Google Calendar's template link works on every platform without a download.
 * A timed gathering is sent as UTC instants; an all-day one as plain dates (the
 * church's days, which is why it needs the church's zone), whose end is the day
 * after the last day, as Google expects. A repeating gathering carries its RRULE
 * so the member's calendar repeats it too. No duration is invented: a gathering
 * with no end is sent as a moment.
 */
import { addDays, dayKeyInZone, resolveZone } from './calendar';

export interface GoogleCalendarEvent {
  title: string;
  /** An instant (ISO string or Date). For an all-day gathering, the church's midnight that starts it. */
  start: string | Date;
  /** The end instant. For an all-day gathering, the midnight after its last day. */
  end?: string | Date | null;
  isAllDay?: boolean;
  location?: string | null;
  details?: string | null;
  /** An iCalendar RRULE, with or without the "RRULE:" prefix. */
  recurrenceRule?: string | null;
  /** The church's IANA zone: places an all-day gathering on its day and keeps a repeating one on the church's clock. */
  timeZone?: string;
}

/** 20260308T090000Z */
const utcStamp = (instant: string | Date) =>
  new Date(instant).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** 20260308 */
const dateStamp = (day: string) => day.replace(/-/g, '');

export function googleCalendarUrl({
  title,
  start,
  end,
  isAllDay = false,
  location,
  details,
  recurrenceRule,
  timeZone,
}: GoogleCalendarEvent): string {
  const zone = resolveZone(timeZone);
  let dates: string;

  if (isAllDay) {
    const first = dayKeyInZone(start, zone);
    // The end is exclusive; never let it fall on or before the first day.
    const afterLast = end ? dayKeyInZone(end, zone) : first;
    dates = `${dateStamp(first)}/${dateStamp(afterLast > first ? afterLast : addDays(first, 1))}`;
  } else {
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : startMs;
    dates = `${utcStamp(start)}/${utcStamp(new Date(Math.max(startMs, endMs)))}`;
  }

  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates });
  if (location) params.set('location', location);
  if (details) params.set('details', details);
  const rule = recurrenceRule?.trim().replace(/^RRULE:/i, '');
  if (rule) params.set('recur', `RRULE:${rule}`);
  if (timeZone && !isAllDay) params.set('ctz', zone);

  return `https://calendar.google.com/calendar/render?${params}`;
}
