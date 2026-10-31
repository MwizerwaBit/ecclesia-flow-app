import { describe, expect, it } from 'vitest';
import {
  buildRule,
  defaultRecurrence,
  describeState,
  startDayMismatch,
  parseRule,
  recurrenceFromRule,
  recurrenceProblem,
  ruleFromRecurrence,
  withFrequency,
  type RecurrenceState,
} from './recurrence';
import { describeRecurrence } from '../workflow/recurrence';

const state = (patch: Partial<RecurrenceState>): RecurrenceState => ({ ...defaultRecurrence(null, patch.freq), ...patch });

describe('buildRule', () => {
  it('builds each frequency', () => {
    expect(buildRule(state({ freq: 'DAILY' }))).toBe('FREQ=DAILY');
    expect(buildRule(state({ freq: 'WEEKLY', weekdays: [0] }))).toBe('FREQ=WEEKLY;BYDAY=SU');
    expect(buildRule(state({ freq: 'YEARLY', interval: 2 }))).toBe('FREQ=YEARLY;INTERVAL=2');
  });

  it('writes weekdays in week order without duplicates', () => {
    expect(buildRule(state({ freq: 'WEEKLY', weekdays: [3, 0, 3] }))).toBe('FREQ=WEEKLY;BYDAY=SU,WE');
  });

  it('builds monthly by day and by ordinal weekday', () => {
    expect(buildRule(state({ freq: 'MONTHLY', monthlyMode: 'day', monthDay: 15 }))).toBe('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(buildRule(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: 1, ordinalWeekday: 0 }))).toBe(
      'FREQ=MONTHLY;BYDAY=1SU',
    );
    expect(buildRule(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: -1, ordinalWeekday: 0 }))).toBe(
      'FREQ=MONTHLY;BYDAY=-1SU',
    );
    expect(buildRule(state({ freq: 'MONTHLY', monthlyMode: 'start' }))).toBe('FREQ=MONTHLY');
  });

  it('ignores settings that do not apply to the frequency', () => {
    expect(buildRule(state({ freq: 'DAILY', weekdays: [1], monthDay: 4, monthlyMode: 'day' }))).toBe('FREQ=DAILY');
  });

  it('writes only the chosen ending', () => {
    expect(buildRule(state({ freq: 'DAILY', end: 'until', until: '2026-12-31', count: 5 }))).toBe(
      'FREQ=DAILY;UNTIL=20261231',
    );
    expect(buildRule(state({ freq: 'DAILY', end: 'count', until: '2026-12-31', count: 5 }))).toBe('FREQ=DAILY;COUNT=5');
    expect(buildRule(state({ freq: 'DAILY', end: 'never', until: '2026-12-31', count: 5 }))).toBe('FREQ=DAILY');
  });

  it('leaves out an ending date that was not chosen', () => {
    expect(buildRule(state({ freq: 'DAILY', end: 'until', until: '' }))).toBe('FREQ=DAILY');
  });
});

describe('parseRule', () => {
  const roundTrips = [
    'FREQ=DAILY',
    'FREQ=DAILY;INTERVAL=3',
    'FREQ=WEEKLY',
    'FREQ=WEEKLY;BYDAY=SU',
    'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH',
    'FREQ=MONTHLY',
    'FREQ=MONTHLY;BYMONTHDAY=15',
    'FREQ=MONTHLY;BYDAY=1SU',
    'FREQ=MONTHLY;INTERVAL=3;BYDAY=-1FR',
    'FREQ=YEARLY;INTERVAL=2',
    'FREQ=WEEKLY;BYDAY=SU;UNTIL=20261231',
    'FREQ=MONTHLY;BYMONTHDAY=1;COUNT=12',
  ];

  it.each(roundTrips)('round-trips %s', (rule) => {
    const parsed = parseRule(rule);
    expect(parsed).not.toBeNull();
    expect(buildRule(parsed!)).toBe(rule);
  });

  it('reads the pieces', () => {
    expect(parseRule('FREQ=MONTHLY;BYDAY=-1SU;UNTIL=20261231')).toMatchObject({
      freq: 'MONTHLY',
      monthlyMode: 'weekday',
      ordinal: -1,
      ordinalWeekday: 0,
      end: 'until',
      until: '2026-12-31',
    });
    expect(parseRule('FREQ=WEEKLY;BYDAY=WE,SU')).toMatchObject({ weekdays: [0, 3] });
    expect(parseRule('FREQ=DAILY;COUNT=366')).toMatchObject({ end: 'count', count: 366 });
  });

  it('accepts a prefix, lower case and spare semicolons', () => {
    expect(parseRule('rrule:freq=weekly;byday=su;')).toMatchObject({ freq: 'WEEKLY', weekdays: [0] });
  });

  it('reads the old fixed choices', () => {
    expect(buildRule(parseRule('FREQ=WEEKLY;BYDAY=WE')!)).toBe('FREQ=WEEKLY;BYDAY=WE');
    expect(buildRule(parseRule('FREQ=MONTHLY')!)).toBe('FREQ=MONTHLY');
  });

  it('refuses a rule that has both COUNT and UNTIL', () => {
    expect(parseRule('FREQ=DAILY;COUNT=3;UNTIL=20261231')).toBeNull();
  });

  it.each([
    '',
    'nonsense',
    'FREQ=HOURLY',
    'FREQ=SECONDLY;INTERVAL=2',
    'FREQ=DAILY;WKST=MO',
    'FREQ=YEARLY;BYMONTH=3',
    'FREQ=DAILY;FREQ=WEEKLY',
    'FREQ=DAILY;INTERVAL=0',
    'FREQ=DAILY;INTERVAL=53',
    'FREQ=DAILY;INTERVAL=x',
    'FREQ=DAILY;COUNT=0',
    'FREQ=DAILY;COUNT=367',
    'FREQ=WEEKLY;BYDAY=1SU',
    'FREQ=WEEKLY;BYDAY=SU,SU',
    'FREQ=WEEKLY;BYDAY=XX',
    'FREQ=WEEKLY;BYMONTHDAY=3',
    'FREQ=DAILY;BYDAY=MO',
    'FREQ=YEARLY;BYMONTHDAY=3',
    'FREQ=MONTHLY;BYDAY=5SU',
    'FREQ=MONTHLY;BYDAY=SU',
    'FREQ=MONTHLY;BYMONTHDAY=32',
    'FREQ=MONTHLY;BYMONTHDAY=-1',
    'FREQ=MONTHLY;BYMONTHDAY=3;BYDAY=1SU',
    'FREQ=DAILY;UNTIL=2026-12-31',
    'FREQ=DAILY;UNTIL=20261231T235959Z',
    'FREQ=DAILY;UNTIL=20260231',
  ])('cannot represent %j', (rule) => {
    expect(parseRule(rule)).toBeNull();
  });
});

describe('recurrenceFromRule / ruleFromRecurrence', () => {
  it('treats an empty rule as not repeating', () => {
    expect(recurrenceFromRule(undefined)).toEqual({ kind: 'none' });
    expect(recurrenceFromRule('  ')).toEqual({ kind: 'none' });
    expect(ruleFromRecurrence({ kind: 'none' })).toBe('');
  });

  it('keeps an unrepresentable rule exactly as stored', () => {
    const value = recurrenceFromRule('FREQ=MONTHLY;BYDAY=5SU');
    expect(value).toEqual({ kind: 'raw', rule: 'FREQ=MONTHLY;BYDAY=5SU' });
    expect(ruleFromRecurrence(value)).toBe('FREQ=MONTHLY;BYDAY=5SU');
  });

  it('builds a rule from a builder value', () => {
    const value = recurrenceFromRule('FREQ=WEEKLY;BYDAY=SU');
    expect(value.kind).toBe('builder');
    expect(ruleFromRecurrence(value)).toBe('FREQ=WEEKLY;BYDAY=SU');
  });
});

describe('defaultRecurrence', () => {
  it('is weekly and names no weekday, so the server follows the start date', () => {
    // 2026-03-08 is a Sunday; 2026-03-11 a Wednesday.
    expect(buildRule(defaultRecurrence('2026-03-08'))).toBe('FREQ=WEEKLY');
    expect(buildRule(defaultRecurrence('2026-03-11'))).toBe('FREQ=WEEKLY');
  });

  it('names no day for monthly either, and offers the matching day and ordinal', () => {
    expect(buildRule(defaultRecurrence('2026-03-08', 'MONTHLY'))).toBe('FREQ=MONTHLY');
    expect(defaultRecurrence('2026-03-08', 'MONTHLY')).toMatchObject({ monthDay: 8, ordinal: 2, ordinalWeekday: 0 });
    // The fifth Sunday of March 2026 is "the last".
    expect(defaultRecurrence('2026-03-29', 'MONTHLY')).toMatchObject({ ordinal: -1, ordinalWeekday: 0 });
  });

  it('keeps interval and ending when the frequency changes', () => {
    const base = state({ freq: 'DAILY', interval: 3, end: 'count', count: 4 });
    expect(buildRule(withFrequency(base, 'WEEKLY', '2026-03-11'))).toBe('FREQ=WEEKLY;INTERVAL=3;COUNT=4');
  });
});

describe('recurrenceProblem', () => {
  const builder = (patch: Partial<RecurrenceState>) => ({ kind: 'builder' as const, state: state(patch) });

  it('accepts a complete rule and anything that is not a builder', () => {
    expect(recurrenceProblem(builder({}), '2026-03-08')).toBeNull();
    expect(recurrenceProblem({ kind: 'none' }, null)).toBeNull();
    expect(recurrenceProblem({ kind: 'raw', rule: 'x' }, null)).toBeNull();
  });

  it('flags an interval out of range', () => {
    expect(recurrenceProblem(builder({ interval: 0 }), null)).toMatch(/1 to 52/);
    expect(recurrenceProblem(builder({ interval: 53 }), null)).toMatch(/1 to 52/);
  });

  it('flags a count out of range', () => {
    expect(recurrenceProblem(builder({ end: 'count', count: 0 }), null)).toMatch(/1 to 366/);
    expect(recurrenceProblem(builder({ end: 'count', count: 367 }), null)).toMatch(/1 to 366/);
  });

  it('needs an ending date that is not before the first gathering', () => {
    expect(recurrenceProblem(builder({ end: 'until', until: '' }), '2026-03-08')).toMatch(/Pick/);
    expect(recurrenceProblem(builder({ end: 'until', until: '2026-03-07' }), '2026-03-08')).toMatch(/before/);
    expect(recurrenceProblem(builder({ end: 'until', until: '2026-03-08' }), '2026-03-08')).toBeNull();
  });
});

describe('describeState', () => {
  it('says it in the same words as the detail page', () => {
    expect(describeState(state({ freq: 'WEEKLY', weekdays: [0], interval: 2, end: 'until', until: '2026-12-31' }), null)).toBe(
      'Every other Sunday, until Dec 31, 2026',
    );
    expect(describeState(state({ freq: 'WEEKLY', weekdays: [0, 3] }), null)).toBe('Every Sunday and Wednesday');
    expect(describeState(state({ freq: 'WEEKLY', weekdays: [1, 3, 5], interval: 3 }), null)).toBe(
      'Every 3 weeks on Monday, Wednesday and Friday',
    );
    expect(describeState(state({ freq: 'DAILY' }), null)).toBe('Every day');
    expect(describeState(state({ freq: 'DAILY', interval: 4, end: 'count', count: 6 }), null)).toBe('Every 4 days, 6 times');
    expect(describeState(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: -1, ordinalWeekday: 0 }), null)).toBe(
      'Last Sunday of every month',
    );
    expect(describeState(state({ freq: 'MONTHLY', monthlyMode: 'day', monthDay: 15, interval: 2 }), null)).toBe(
      '15th of every other month',
    );
    expect(describeState(state({ freq: 'YEARLY' }), '2026-12-25')).toBe('Every year on December 25');
  });

  it('matches the rule-string describer for the rule it builds', () => {
    const s = state({ freq: 'WEEKLY', weekdays: [1, 3], interval: 2, end: 'count', count: 5 });
    expect(describeState(s, null)).toBe(describeRecurrence(buildRule(s)));
  });

  it('uses the start date for a rule that does not name a day', () => {
    expect(describeState(state({ freq: 'WEEKLY', weekdays: [] }), '2026-03-08')).toBe('Every Sunday');
    expect(describeState(state({ freq: 'MONTHLY', monthlyMode: 'start' }), '2026-03-08')).toBe('8th of every month');
  });
});

describe('startDayMismatch', () => {
  // 2026-03-08 is the second Sunday of March; 2026-03-11 a Wednesday; 2026-03-29 the fifth (last) Sunday.
  it('says nothing for a rule that follows the start date', () => {
    expect(startDayMismatch(state({ freq: 'WEEKLY', weekdays: [] }), '2026-03-11')).toBeNull();
    expect(startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'start' }), '2026-03-11')).toBeNull();
    expect(startDayMismatch(state({ freq: 'DAILY' }), '2026-03-11')).toBeNull();
  });

  it('says nothing without a start date or when the start date is one of the days', () => {
    expect(startDayMismatch(state({ freq: 'WEEKLY', weekdays: [0] }), null)).toBeNull();
    expect(startDayMismatch(state({ freq: 'WEEKLY', weekdays: [0, 3] }), '2026-03-11')).toBeNull();
    expect(startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'day', monthDay: 11 }), '2026-03-11')).toBeNull();
    expect(
      startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: 2, ordinalWeekday: 0 }), '2026-03-08'),
    ).toBeNull();
    expect(
      startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: -1, ordinalWeekday: 0 }), '2026-03-29'),
    ).toBeNull();
  });

  it('warns when the start date is not one of the weekly days', () => {
    expect(startDayMismatch(state({ freq: 'WEEKLY', weekdays: [0] }), '2026-03-11')).toMatch(/on a Wednesday/);
  });

  it('warns when the start date is not the chosen day of the month or ordinal weekday', () => {
    expect(startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'day', monthDay: 15 }), '2026-03-11')).toMatch(
      /day 11, not day 15/,
    );
    expect(
      startDayMismatch(state({ freq: 'MONTHLY', monthlyMode: 'weekday', ordinal: 1, ordinalWeekday: 0 }), '2026-03-08'),
    ).toMatch(/first Sunday/);
  });
});
