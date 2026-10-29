/**
 * @file calendar.ts
 * @description Dates for the calendar, placed in the church's time zone.
 *
 * Every calendar screen answers "which day is this on?" and the honest answer is
 * the church's day, not the viewer's browser's: a 09:00 service in Kigali is a
 * Sunday-morning service even when someone looks at it from another continent.
 * All of that arithmetic lives here, in one tested place, built on `Intl` (which
 * knows time zones and daylight saving) so no date library is needed.
 *
 * Vocabulary:
 *   instant   a point in time: an ISO string or Date (what the API sends)
 *   DayKey    a calendar day with no time or zone: "2026-03-08"
 *   zone      an IANA zone name: "Africa/Kigali"
 * DayKey arithmetic (addDays, grids, weekdays) is plain calendar maths and does
 * not depend on a zone; only converting between instants and DayKeys does.
 */

export type DayKey = string;
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

const MS_PER_DAY = 86_400_000;

// ─── Instants <-> the church's wall clock ─────────────────────────────────────

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

/** True when `zone` is a time zone this browser knows. */
export function isKnownZone(zone: string | null | undefined): zone is string {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** A usable zone: the church's if it is valid, else the browser's own. */
export function resolveZone(zone: string | null | undefined): string {
  if (isKnownZone(zone)) return zone;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The wall-clock reading of an instant in a zone. */
export function zonedParts(instant: string | Date, zone: string): ZonedParts {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const raw: Record<string, string> = {};
  for (const part of partsFormatter(zone).formatToParts(date)) raw[part.type] = part.value;
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    hour: Number(raw.hour) % 24,
    minute: Number(raw.minute),
    second: Number(raw.second),
    weekday: WEEKDAYS.indexOf(raw.weekday),
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function dayKeyOf(year: number, month: number, day: number): DayKey {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** Which of the church's days an instant falls on. */
export function dayKeyInZone(instant: string | Date, zone: string): DayKey {
  const p = zonedParts(instant, zone);
  return dayKeyOf(p.year, p.month, p.day);
}

/** Today, in the church's zone. */
export function todayKey(zone: string, now: Date = new Date()): DayKey {
  return dayKeyInZone(now, zone);
}

/** `YYYY-MM-DDTHH:mm`, the value a date-time input holds, for an instant in a zone. */
export function toLocalInput(instant: string | Date, zone: string): string {
  const p = zonedParts(instant, zone);
  return `${dayKeyOf(p.year, p.month, p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Offset of `zone` from UTC at an instant, in ms (positive east of Greenwich). */
function offsetAt(instantMs: number, zone: string): number {
  const p = zonedParts(new Date(instantMs), zone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * The instant at which a zone's clock reads `day` `time` ("09:00"). A time the
 * clock skips (the spring-forward gap) lands on the next valid minute, as the
 * server does; a time that happens twice (the autumn fold) is the earlier one.
 */
export function zonedTimeToInstant(day: DayKey, time: string, zone: string): Date {
  const { year, month, day: d } = parseDayKey(day);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, d, hour, minute);
  // Try the offset at the wall time read as UTC, then correct once for a change near it.
  let guess = wall - offsetAt(wall, zone);
  const corrected = wall - offsetAt(guess, zone);
  if (corrected !== guess) {
    const again = wall - offsetAt(corrected, zone);
    // Disagreement means the wall time does not exist: move forward past the gap.
    guess = again === corrected ? corrected : Math.max(guess, corrected);
  }
  return new Date(guess);
}

/** The instant a church's day begins (its local midnight). */
export function startOfDay(day: DayKey, zone: string): Date {
  return zonedTimeToInstant(day, '00:00', zone);
}

// ─── Calendar arithmetic (zone-free) ──────────────────────────────────────────

function toUtcMs(day: DayKey): number {
  const { year, month, day: d } = parseDayKey(day);
  return Date.UTC(year, month - 1, d);
}

export function addDays(day: DayKey, days: number): DayKey {
  const date = new Date(toUtcMs(day) + days * MS_PER_DAY);
  return dayKeyOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** 0 = Sunday. */
export function weekdayOf(day: DayKey): number {
  return new Date(toUtcMs(day)).getUTCDay();
}

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export function monthOf(day: DayKey): YearMonth {
  const { year, month } = parseDayKey(day);
  return { year, month };
}

export function addMonths({ year, month }: YearMonth, months: number): YearMonth {
  const index = year * 12 + (month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function firstOfMonth({ year, month }: YearMonth): DayKey {
  return dayKeyOf(year, month, 1);
}

export function isSameMonth(day: DayKey, { year, month }: YearMonth): boolean {
  const p = parseDayKey(day);
  return p.year === year && p.month === month;
}

/**
 * The days a month grid shows: whole weeks, always six of them (42 days) so the
 * grid does not jump in height from month to month.
 */
export function monthGrid(target: YearMonth, weekStart: WeekStart): DayKey[] {
  const first = firstOfMonth(target);
  const lead = (weekdayOf(first) - weekStart + 7) % 7;
  const gridStart = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Weekday indexes (0 = Sunday) in the order a week is shown. */
export function weekdayOrder(weekStart: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

/**
 * The API window for a set of days: from the church's midnight of the first day
 * to its midnight after the last, as ISO instants. (The API reads a window of at
 * most 93 days; a month grid is 42.)
 */
export function windowForDays(days: DayKey[], zone: string): { from: string; to: string } {
  const first = days[0];
  const afterLast = addDays(days[days.length - 1], 1);
  return { from: startOfDay(first, zone).toISOString(), to: startOfDay(afterLast, zone).toISOString() };
}

// ─── Placing occurrences on days ──────────────────────────────────────────────

interface Dated {
  occurrenceStart: string;
  occurrenceEnd: string | null;
  isAllDay: boolean;
}

/**
 * Every church day an occurrence touches. A timed event is on each day it
 * overlaps (an overnight vigil is on two); an all-day event's end is the
 * midnight after its last day, so it covers the days before that. An end exactly
 * at midnight does not spill onto the next day.
 */
export function occurrenceDays(occurrence: Dated, zone: string): DayKey[] {
  const first = dayKeyInZone(occurrence.occurrenceStart, zone);
  if (!occurrence.occurrenceEnd) return [first];
  const endMs = new Date(occurrence.occurrenceEnd).getTime();
  const startMs = new Date(occurrence.occurrenceStart).getTime();
  const last = dayKeyInZone(new Date(Math.max(startMs, endMs - 1)), zone);
  const count = Math.min(daysBetween(first, last), 62);
  return Array.from({ length: count + 1 }, (_, i) => addDays(first, i));
}

/** Occurrences by the day they fall on, each day's list in start-time order. */
export function groupByDay<T extends Dated>(occurrences: T[], zone: string): Map<DayKey, T[]> {
  const byDay = new Map<DayKey, T[]>();
  for (const occurrence of occurrences) {
    for (const day of occurrenceDays(occurrence, zone)) {
      const list = byDay.get(day);
      if (list) list.push(occurrence);
      else byDay.set(day, [occurrence]);
    }
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1; // all-day first
      return new Date(a.occurrenceStart).getTime() - new Date(b.occurrenceStart).getTime();
    });
  }
  return byDay;
}

// ─── Showing them ─────────────────────────────────────────────────────────────

/** "9:00 AM" for an instant, in the church's zone. */
export function formatClock(instant: string | Date, zone: string, locale = 'en-US'): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(date);
}

/** A DayKey as text, e.g. "Sun, Mar 8". The day is a calendar date, so no zone shifts it. */
export function formatDay(
  day: DayKey,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' },
  locale = 'en-US',
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(toUtcMs(day)));
}

/** "March 2026". */
export function formatMonth({ year, month }: YearMonth, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** Short weekday header ("Sun"), by weekday index. */
export function weekdayLabel(weekday: number, style: 'short' | 'narrow' | 'long' = 'short', locale = 'en-US'): string {
  // 2026-03-01 is a Sunday.
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 2, 1 + weekday)),
  );
}

/** When an occurrence happens, in words: "9:00 AM – 10:30 AM", "All day", "Mar 10 – Mar 12". */
export function describeWhen(occurrence: Dated, zone: string, locale = 'en-US'): string {
  const days = occurrenceDays(occurrence, zone);
  if (occurrence.isAllDay) {
    if (days.length > 1) return `${formatDay(days[0], { month: 'short', day: 'numeric' }, locale)} – ${formatDay(days[days.length - 1], { month: 'short', day: 'numeric' }, locale)}`;
    return 'All day';
  }
  const start = formatClock(occurrence.occurrenceStart, zone, locale);
  if (!occurrence.occurrenceEnd) return start;
  if (days.length > 1) {
    const day = (d: DayKey) => formatDay(d, { month: 'short', day: 'numeric' }, locale);
    return `${day(days[0])}, ${start} – ${day(days[days.length - 1])}, ${formatClock(occurrence.occurrenceEnd, zone, locale)}`;
  }
  return `${start} – ${formatClock(occurrence.occurrenceEnd, zone, locale)}`;
}
