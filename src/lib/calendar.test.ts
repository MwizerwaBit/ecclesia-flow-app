import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dayKeyInZone,
  daysBetween,
  describeWhen,
  groupByDay,
  isKnownZone,
  monthGrid,
  occurrenceDays,
  resolveZone,
  startOfDay,
  toLocalInput,
  weekdayOf,
  weekdayOrder,
  windowForDays,
  zonedTimeToInstant,
} from './calendar';

const NY = 'America/New_York';
const KIGALI = 'Africa/Kigali';

describe('zones', () => {
  it('knows real zones and rejects made-up ones', () => {
    expect(isKnownZone(NY)).toBe(true);
    expect(isKnownZone('Mars/Olympus')).toBe(false);
    expect(isKnownZone(null)).toBe(false);
    expect(isKnownZone(resolveZone('Mars/Olympus'))).toBe(true); // falls back to the browser's zone
  });

  it('puts an instant on the church day, not the viewer day', () => {
    // 23:30 UTC on 10 March is already 11 March in Kigali (UTC+2) and still 10 March in New York.
    expect(dayKeyInZone('2026-03-10T23:30:00Z', KIGALI)).toBe('2026-03-11');
    expect(dayKeyInZone('2026-03-10T23:30:00Z', NY)).toBe('2026-03-10');
  });
});

describe('wall clock <-> instant', () => {
  it('converts a local time to the right instant on both sides of daylight saving', () => {
    expect(zonedTimeToInstant('2026-03-01', '09:00', NY).toISOString()).toBe('2026-03-01T14:00:00.000Z'); // EST
    expect(zonedTimeToInstant('2026-03-15', '09:00', NY).toISOString()).toBe('2026-03-15T13:00:00.000Z'); // EDT
    expect(zonedTimeToInstant('2026-03-15', '09:00', KIGALI).toISOString()).toBe('2026-03-15T07:00:00.000Z');
  });

  it('moves a time the clock skips forward, and takes the first of a repeated time', () => {
    // 02:30 on 8 March 2026 does not exist in New York (clocks jump 02:00 -> 03:00).
    expect(toLocalInput(zonedTimeToInstant('2026-03-08', '02:30', NY), NY)).toBe('2026-03-08T03:30');
    // 01:30 on 1 November 2026 happens twice; the earlier one is still daylight time (UTC-4).
    expect(zonedTimeToInstant('2026-11-01', '01:30', NY).toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('round-trips through the date-time input value', () => {
    const instant = '2026-06-10T14:00:00Z';
    const local = toLocalInput(instant, NY);
    expect(local).toBe('2026-06-10T10:00');
    expect(zonedTimeToInstant(local.slice(0, 10), local.slice(11), NY).toISOString()).toBe('2026-06-10T14:00:00.000Z');
  });

  it('finds the start of a day, which is 23 or 25 hours long on a clock-change day', () => {
    const start = startOfDay('2026-03-08', NY).getTime();
    const next = startOfDay('2026-03-09', NY).getTime();
    expect((next - start) / 3_600_000).toBe(23);
    expect((startOfDay('2026-11-02', NY).getTime() - startOfDay('2026-11-01', NY).getTime()) / 3_600_000).toBe(25);
  });
});

describe('calendar arithmetic', () => {
  it('adds days and months across boundaries and leap years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(daysBetween('2026-03-01', '2026-03-08')).toBe(7);
    expect(weekdayOf('2026-03-01')).toBe(0); // a Sunday
  });

  it('builds a six-week grid that starts on the chosen weekday and contains the whole month', () => {
    const sunday = monthGrid({ year: 2026, month: 3 }, 0);
    expect(sunday).toHaveLength(42);
    expect(sunday[0]).toBe('2026-03-01');
    expect(sunday[41]).toBe('2026-04-11');
    const monday = monthGrid({ year: 2026, month: 3 }, 1);
    expect(monday[0]).toBe('2026-02-23');
    expect(weekdayOf(monday[0])).toBe(1);
    expect(monday).toContain('2026-03-31');
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    // February 2026 starts on a Sunday and has exactly four weeks; the grid still shows six.
    expect(monthGrid({ year: 2026, month: 2 }, 0)[0]).toBe('2026-02-01');
  });

  it('asks the API for the church midnight at each end of the grid', () => {
    const days = monthGrid({ year: 2026, month: 3 }, 0);
    const window = windowForDays(days, NY);
    expect(window.from).toBe(startOfDay('2026-03-01', NY).toISOString());
    expect(window.to).toBe(startOfDay('2026-04-12', NY).toISOString());
  });
});

describe('placing occurrences on days', () => {
  const timed = (start: string, end: string | null) => ({ occurrenceStart: start, occurrenceEnd: end, isAllDay: false });

  it('puts a one-hour event on one day and an overnight event on two', () => {
    expect(occurrenceDays(timed('2026-06-10T14:00:00Z', '2026-06-10T15:00:00Z'), NY)).toEqual(['2026-06-10']);
    expect(occurrenceDays(timed('2026-06-11T00:00:00Z', '2026-06-11T14:00:00Z'), NY)).toEqual(['2026-06-10', '2026-06-11']);
    expect(occurrenceDays(timed('2026-06-10T14:00:00Z', null), NY)).toEqual(['2026-06-10']);
  });

  it('does not spill an event that ends exactly at midnight onto the next day', () => {
    // 20:00-00:00 New York time on 10 June.
    expect(occurrenceDays(timed('2026-06-11T00:00:00Z', '2026-06-11T04:00:00Z'), NY)).toEqual(['2026-06-10']);
  });

  it('covers every day of a multi-day all-day event and not the day after', () => {
    const camp = {
      occurrenceStart: startOfDay('2026-06-10', NY).toISOString(),
      occurrenceEnd: startOfDay('2026-06-13', NY).toISOString(),
      isAllDay: true,
    };
    expect(occurrenceDays(camp, NY)).toEqual(['2026-06-10', '2026-06-11', '2026-06-12']);
  });

  it('groups by day with all-day events first and the rest by start time', () => {
    const a = { ...timed('2026-06-10T18:00:00Z', null), id: 'late' };
    const b = { ...timed('2026-06-10T13:00:00Z', null), id: 'early' };
    const c = { occurrenceStart: startOfDay('2026-06-10', NY).toISOString(), occurrenceEnd: startOfDay('2026-06-11', NY).toISOString(), isAllDay: true, id: 'all-day' };
    const grouped = groupByDay([a, b, c], NY);
    expect(grouped.get('2026-06-10')?.map((o) => o.id)).toEqual(['all-day', 'early', 'late']);
  });
});

describe('describing times', () => {
  it('says when in the church zone', () => {
    expect(describeWhen({ occurrenceStart: '2026-03-15T13:00:00Z', occurrenceEnd: '2026-03-15T14:30:00Z', isAllDay: false }, NY)).toBe(
      '9:00 AM – 10:30 AM',
    );
    expect(describeWhen({ occurrenceStart: startOfDay('2026-06-10', NY).toISOString(), occurrenceEnd: startOfDay('2026-06-11', NY).toISOString(), isAllDay: true }, NY)).toBe('All day');
    expect(
      describeWhen({ occurrenceStart: startOfDay('2026-06-10', NY).toISOString(), occurrenceEnd: startOfDay('2026-06-13', NY).toISOString(), isAllDay: true }, NY),
    ).toBe('Jun 10 – Jun 12');
  });
});
