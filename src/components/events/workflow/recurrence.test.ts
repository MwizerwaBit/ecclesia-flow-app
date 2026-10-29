import { describe, expect, it } from 'vitest';
import { describeRecurrence } from './recurrence';

describe('describeRecurrence', () => {
  it('says nothing repeats when there is no rule', () => {
    expect(describeRecurrence(null)).toBe('Does not repeat');
    expect(describeRecurrence('')).toBe('Does not repeat');
  });

  it('describes daily and weekly rules', () => {
    expect(describeRecurrence('FREQ=DAILY')).toBe('Every day');
    expect(describeRecurrence('FREQ=DAILY;INTERVAL=3')).toBe('Every 3 days');
    expect(describeRecurrence('FREQ=WEEKLY')).toBe('Every week');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU')).toBe('Every Sunday');
    expect(describeRecurrence('RRULE:FREQ=WEEKLY;BYDAY=SU')).toBe('Every Sunday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU;INTERVAL=2')).toBe('Every other Sunday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU;INTERVAL=3')).toBe('Every 3 weeks on Sunday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe('Every Monday, Wednesday and Friday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')).toBe('Every weekday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=MO,TH;INTERVAL=2')).toBe('Every other week on Monday and Thursday');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR,SA')).toBe('Every day');
  });

  it('describes monthly rules', () => {
    expect(describeRecurrence('FREQ=MONTHLY;BYDAY=1SU')).toBe('First Sunday of every month');
    expect(describeRecurrence('FREQ=MONTHLY;BYDAY=-1FR')).toBe('Last Friday of every month');
    expect(describeRecurrence('FREQ=MONTHLY;BYDAY=SU;BYSETPOS=2')).toBe('Second Sunday of every month');
    expect(describeRecurrence('FREQ=MONTHLY;BYDAY=3SA;INTERVAL=2')).toBe('Third Saturday of every other month');
    expect(describeRecurrence('FREQ=MONTHLY;BYMONTHDAY=15')).toBe('15th of every month');
    expect(describeRecurrence('FREQ=MONTHLY;BYMONTHDAY=1,21')).toBe('1st and 21st of every month');
    expect(describeRecurrence('FREQ=MONTHLY;BYMONTHDAY=-1')).toBe('Last day of every month');
    expect(describeRecurrence('FREQ=MONTHLY;INTERVAL=3')).toBe('Every 3 months');
  });

  it('describes yearly rules', () => {
    expect(describeRecurrence('FREQ=YEARLY')).toBe('Every year');
    expect(describeRecurrence('FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25')).toBe('Every year on December 25');
  });

  it('adds how the series ends', () => {
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU;COUNT=10')).toBe('Every Sunday, 10 times');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU;COUNT=1')).toBe('Every Sunday, 1 time');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=SU;UNTIL=20261231')).toBe('Every Sunday, until Dec 31, 2026');
  });

  it('places a UTC UNTIL on the church day', () => {
    // 23:00 UTC on Dec 30 is already Dec 31 in Kigali (UTC+2).
    const rule = 'FREQ=WEEKLY;BYDAY=SU;UNTIL=20261230T230000Z';
    expect(describeRecurrence(rule, 'Africa/Kigali')).toBe('Every Sunday, until Dec 31, 2026');
    expect(describeRecurrence(rule, 'UTC')).toBe('Every Sunday, until Dec 30, 2026');
  });

  it('does not guess at rules it cannot read', () => {
    expect(describeRecurrence('FREQ=HOURLY')).toBe('Repeats on a custom schedule');
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=0')).toBe('Repeats on a custom schedule');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=XX')).toBe('Repeats on a custom schedule');
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=1SU')).toBe('Repeats on a custom schedule');
  });

  it('names the start date’s day for a rule that names none', () => {
    // 2026-03-08 is a Sunday.
    expect(describeRecurrence('FREQ=WEEKLY', undefined, '2026-03-08')).toBe('Every Sunday');
    expect(describeRecurrence('FREQ=WEEKLY;INTERVAL=2', undefined, '2026-03-08')).toBe('Every other Sunday');
    expect(describeRecurrence('FREQ=MONTHLY', undefined, '2026-03-08')).toBe('8th of every month');
    expect(describeRecurrence('FREQ=YEARLY', undefined, '2026-12-25')).toBe('Every year on December 25');
    // A rule that does name its days is not second-guessed.
    expect(describeRecurrence('FREQ=WEEKLY;BYDAY=WE', undefined, '2026-03-08')).toBe('Every Wednesday');
    expect(describeRecurrence('FREQ=MONTHLY;BYMONTHDAY=15', undefined, '2026-03-08')).toBe('15th of every month');
    expect(describeRecurrence('FREQ=DAILY', undefined, '2026-03-08')).toBe('Every day');
  });
});
