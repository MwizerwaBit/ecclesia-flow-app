import { describe, expect, it } from 'vitest';
import { groupByDay, monthGrid } from '@/lib/calendar';
import type { CalendarItem } from '@/types';
import {
  agendaDays,
  countLabel,
  daysInMonth,
  defaultFocusDay,
  formatMonthParam,
  keyboardTarget,
  overlapsWindow,
  parseCalendarParams,
  parseMonthParam,
  shiftMonth,
  visibleSlice,
  writeCalendarParams,
} from './calendarState';
import { chipTime, itemAccent, itemFlags, rowTime } from './itemMeta';

const params = (query: string) => new URLSearchParams(query);

const GROUP_ID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const UNIT_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

describe('calendar URL state', () => {
  it('reads month, view and filters', () => {
    const state = parseCalendarParams(params(`month=2026-03&view=agenda&type=service&group=${GROUP_ID}&unit=${UNIT_ID}&status=draft`));
    expect(state.month).toEqual({ year: 2026, month: 3 });
    expect(state.view).toBe('agenda');
    expect(state.filters).toEqual({ type: 'service', groupId: GROUP_ID, unitId: UNIT_ID, status: 'draft' });
  });

  it('falls back to no month, the month view and no filters for an empty or malformed URL', () => {
    expect(parseCalendarParams(params(''))).toEqual({ month: null, view: 'month', filters: {} });
    const bad = parseCalendarParams(params('month=2026-13&view=week&type=party&status=nope&group=a b'));
    expect(bad).toEqual({ month: null, view: 'month', filters: {} });
    expect(parseMonthParam('2026-3')).toBeNull();
    expect(parseMonthParam('1800-01')).toBeNull();
  });

  it('drops prototype names and ids that are not UUIDs', () => {
    const bad = parseCalendarParams(params('type=constructor&status=toString&group=abc&unit=g-1'));
    expect(bad.filters).toEqual({});
    expect(parseCalendarParams(params('type=__proto__&status=hasOwnProperty')).filters).toEqual({});
    expect(parseCalendarParams(params(`group=${GROUP_ID.toUpperCase()}`)).filters).toEqual({ groupId: GROUP_ID.toUpperCase() });
  });

  it('ignores filters the screen does not offer', () => {
    const state = parseCalendarParams(params(`type=service&status=draft&unit=${UNIT_ID}`), ['type']);
    expect(state.filters).toEqual({ type: 'service' });
  });

  it('writes a link that reads back the same', () => {
    const state = { month: { year: 2026, month: 5 }, view: 'agenda' as const, filters: { type: 'meeting' as const, groupId: GROUP_ID } };
    const written = writeCalendarParams(params(''), state, { year: 2026, month: 3 });
    expect(written.get('month')).toBe('2026-05');
    expect(parseCalendarParams(written)).toEqual({ month: state.month, view: 'agenda', filters: state.filters });
  });

  it('keeps the URL clean for the current month, the month view and no filters', () => {
    const written = writeCalendarParams(params('month=2026-05&status=draft'), { month: { year: 2026, month: 3 }, view: 'month', filters: {} }, { year: 2026, month: 3 });
    expect(written.toString()).toBe('');
  });

  it("leaves parameters that are not the calendar's alone", () => {
    const written = writeCalendarParams(params('start=2026-03-08&month=2026-04'), { month: { year: 2026, month: 3 }, view: 'month', filters: {} }, { year: 2026, month: 3 });
    expect(written.toString()).toBe('start=2026-03-08');
  });

  it('formats a month parameter with padding', () => {
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('agenda window', () => {
  it('starts today in the current month and runs 60 days', () => {
    const days = agendaDays({ year: 2026, month: 3 }, '2026-03-18');
    expect(days).toHaveLength(60);
    expect(days[0]).toBe('2026-03-18');
    expect(days[59]).toBe('2026-05-16');
  });

  it('starts on the first of another month and never exceeds 93 days', () => {
    expect(agendaDays({ year: 2026, month: 7 }, '2026-03-18')[0]).toBe('2026-07-01');
    expect(agendaDays({ year: 2026, month: 7 }, '2026-03-18', 500)).toHaveLength(93);
  });

  it('keeps an item in the window when it overlaps, drops one outside', () => {
    const from = '2026-03-01T00:00:00Z';
    const to = '2026-04-12T00:00:00Z';
    expect(overlapsWindow({ occurrenceStart: '2026-03-08T09:00:00Z', occurrenceEnd: null }, from, to)).toBe(true);
    expect(overlapsWindow({ occurrenceStart: '2026-02-28T20:00:00Z', occurrenceEnd: '2026-03-01T06:00:00Z' }, from, to)).toBe(true);
    expect(overlapsWindow({ occurrenceStart: '2026-05-01T09:00:00Z', occurrenceEnd: null }, from, to)).toBe(false);
    expect(overlapsWindow({ occurrenceStart: '2026-02-01T09:00:00Z', occurrenceEnd: '2026-02-01T10:00:00Z' }, from, to)).toBe(false);
  });
});

describe('grid keyboard navigation', () => {
  // 2026-03-11 is a Wednesday.
  it('moves by day and week', () => {
    expect(keyboardTarget('2026-03-11', 'ArrowLeft', 0)).toBe('2026-03-10');
    expect(keyboardTarget('2026-03-11', 'ArrowRight', 0)).toBe('2026-03-12');
    expect(keyboardTarget('2026-03-11', 'ArrowUp', 0)).toBe('2026-03-04');
    expect(keyboardTarget('2026-03-11', 'ArrowDown', 0)).toBe('2026-03-18');
  });

  it('crosses month and year edges', () => {
    expect(keyboardTarget('2026-03-31', 'ArrowRight', 0)).toBe('2026-04-01');
    expect(keyboardTarget('2026-01-01', 'ArrowLeft', 0)).toBe('2025-12-31');
  });

  it('jumps to the start and end of the week, by week start', () => {
    expect(keyboardTarget('2026-03-11', 'Home', 0)).toBe('2026-03-08'); // Sunday
    expect(keyboardTarget('2026-03-11', 'End', 0)).toBe('2026-03-14'); // Saturday
    expect(keyboardTarget('2026-03-11', 'Home', 1)).toBe('2026-03-09'); // Monday
    expect(keyboardTarget('2026-03-11', 'End', 1)).toBe('2026-03-15'); // Sunday
    expect(keyboardTarget('2026-03-08', 'Home', 0)).toBe('2026-03-08');
    expect(keyboardTarget('2026-03-14', 'End', 0)).toBe('2026-03-14');
  });

  it('changes month with PageUp and PageDown, clamping the day', () => {
    expect(keyboardTarget('2026-03-11', 'PageDown', 0)).toBe('2026-04-11');
    expect(keyboardTarget('2026-03-11', 'PageUp', 0)).toBe('2026-02-11');
    expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonth('2024-01-31', 1)).toBe('2024-02-29');
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('ignores other keys', () => {
    expect(keyboardTarget('2026-03-11', 'a', 0)).toBeNull();
    expect(keyboardTarget('2026-03-11', 'Enter', 0)).toBeNull();
  });

  it('knows month lengths', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 12 })).toBe(31);
  });

  it('picks the one tab stop: the open day, else today, else the 1st', () => {
    const march = { year: 2026, month: 3 };
    expect(defaultFocusDay(march, '2026-03-18', '2026-03-20')).toBe('2026-03-20');
    expect(defaultFocusDay(march, '2026-03-18', null)).toBe('2026-03-18');
    expect(defaultFocusDay(march, '2026-04-02', '2026-04-05')).toBe('2026-03-01');
  });

  it('always lands on a day the grid shows when stepping a week from inside the month', () => {
    const grid = monthGrid({ year: 2026, month: 3 }, 0);
    for (const day of grid.slice(0, 35)) expect(grid).toContain(keyboardTarget(day, 'ArrowDown', 0));
  });
});

describe('cells', () => {
  it('slices for "+N more"', () => {
    expect(visibleSlice([1, 2, 3, 4, 5], 3)).toEqual({ shown: [1, 2, 3], hidden: 2 });
    expect(visibleSlice([1, 2], 3)).toEqual({ shown: [1, 2], hidden: 0 });
  });

  it('counts events for a day label', () => {
    expect(countLabel(0)).toBe('No events');
    expect(countLabel(1)).toBe('1 event');
    expect(countLabel(4)).toBe('4 events');
  });
});

const item = (over: Partial<CalendarItem> = {}): CalendarItem => ({
  eventId: 'e1',
  title: 'Sunday service',
  type: 'service',
  location: null,
  occurrenceStart: '2026-03-08T07:00:00Z',
  occurrenceEnd: '2026-03-08T09:00:00Z',
  isAllDay: false,
  isRecurring: false,
  accentColor: null,
  ...over,
});

describe('item grouping and meta (church zone)', () => {
  const zone = 'Africa/Kigali'; // UTC+2

  it('places a late-evening UTC item on the church day, not the UTC day', () => {
    const late = item({ occurrenceStart: '2026-03-08T23:00:00Z', occurrenceEnd: '2026-03-08T23:30:00Z' });
    const byDay = groupByDay([late], zone);
    expect([...byDay.keys()]).toEqual(['2026-03-09']);
  });

  it('puts a multi-day item on each day it covers', () => {
    const camp = item({ occurrenceStart: '2026-03-09T22:00:00Z', occurrenceEnd: '2026-03-12T22:00:00Z', isAllDay: true });
    expect([...groupByDay([camp], zone).keys()]).toEqual(['2026-03-10', '2026-03-11', '2026-03-12']);
  });

  it('shows the time on the first day only', () => {
    const vigil = item({ occurrenceStart: '2026-03-08T20:00:00Z', occurrenceEnd: '2026-03-09T04:00:00Z' });
    expect(chipTime(vigil, '2026-03-08', zone)).toBe('10:00 PM');
    expect(chipTime(vigil, '2026-03-09', zone)).toBe('');
    expect(rowTime(vigil, '2026-03-09', zone)).toBe('Continues');
    expect(chipTime(item({ isAllDay: true }), '2026-03-08', zone)).toBe('');
  });

  it('flags status, group-only and recurring, most important first', () => {
    const flags = itemFlags(item({ status: 'pending_review', visibility: 'private', isRecurring: true }));
    expect(flags.map((f) => f.key)).toEqual(['pending_review', 'group_only', 'recurring']);
    expect(itemFlags(item({ status: 'published', visibility: 'public' }))).toEqual([]);
    expect(itemFlags(item())).toEqual([]);
    expect(itemFlags(item({ status: 'canceled' }))[0]).toMatchObject({ key: 'canceled', tone: 'danger' });
  });

  it('colors the accent by status, then type; a public item counts as published', () => {
    expect(itemAccent(item({ status: 'canceled' }))).toBe('danger');
    expect(itemAccent(item({ status: 'draft' }))).toBe('warning');
    expect(itemAccent(item())).toBe('primary');
    expect(itemAccent(item({ type: 'meeting' }))).toBe('none');
  });
});
