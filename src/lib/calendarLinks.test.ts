import { describe, expect, it } from 'vitest';
import { googleCalendarUrl } from './calendarLinks';

const parse = (url: string) => new URL(url).searchParams;

describe('googleCalendarUrl', () => {
  it('sends a timed gathering as UTC stamps with its real end', () => {
    const url = googleCalendarUrl({
      title: 'Sunday service',
      start: '2026-03-08T07:00:00Z',
      end: '2026-03-08T09:30:00.000Z',
      location: 'Main hall',
    });
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const p = parse(url);
    expect(p.get('action')).toBe('TEMPLATE');
    expect(p.get('text')).toBe('Sunday service');
    expect(p.get('dates')).toBe('20260308T070000Z/20260308T093000Z');
    expect(p.get('location')).toBe('Main hall');
    expect(p.has('recur')).toBe(false);
  });

  it('does not invent a duration when there is no end', () => {
    const p = parse(googleCalendarUrl({ title: 'Vigil', start: '2026-03-08T07:00:00Z' }));
    expect(p.get('dates')).toBe('20260308T070000Z/20260308T070000Z');
  });

  it('never ends before it starts', () => {
    const p = parse(googleCalendarUrl({ title: 'x', start: '2026-03-08T07:00:00Z', end: '2026-03-08T06:00:00Z' }));
    expect(p.get('dates')).toBe('20260308T070000Z/20260308T070000Z');
  });

  it("sends an all-day gathering as the church's dates, end exclusive", () => {
    // Kigali is UTC+2: its midnights are 22:00Z the evening before.
    const p = parse(
      googleCalendarUrl({
        title: 'Conference',
        start: '2026-03-09T22:00:00Z',
        end: '2026-03-12T22:00:00Z',
        isAllDay: true,
        timeZone: 'Africa/Kigali',
      }),
    );
    expect(p.get('dates')).toBe('20260310/20260313');
    expect(p.has('ctz')).toBe(false);
  });

  it('ends a one-day all-day gathering on the next day, with or without an end', () => {
    const base = { title: 'Retreat', start: '2026-03-07T22:00:00Z', isAllDay: true, timeZone: 'Africa/Kigali' };
    const withEnd = parse(googleCalendarUrl({ ...base, end: '2026-03-08T22:00:00Z' }));
    const withoutEnd = parse(googleCalendarUrl(base));
    expect(withEnd.get('dates')).toBe('20260308/20260309');
    expect(withoutEnd.get('dates')).toBe('20260308/20260309');
  });

  it('adds the repeat rule once, whether or not it has the RRULE prefix', () => {
    for (const rule of ['FREQ=WEEKLY;BYDAY=SU', 'RRULE:FREQ=WEEKLY;BYDAY=SU']) {
      const p = parse(googleCalendarUrl({ title: 'x', start: '2026-03-08T07:00:00Z', recurrenceRule: rule }));
      expect(p.get('recur')).toBe('RRULE:FREQ=WEEKLY;BYDAY=SU');
    }
  });

  it('keeps a timed gathering on the church clock when the zone is known', () => {
    const p = parse(googleCalendarUrl({ title: 'x', start: '2026-03-08T07:00:00Z', timeZone: 'Africa/Kigali' }));
    expect(p.get('ctz')).toBe('Africa/Kigali');
  });

  it('carries the description and leaves out empty fields', () => {
    const p = parse(
      googleCalendarUrl({ title: 'x', start: '2026-03-08T07:00:00Z', details: 'Bring a friend', location: '', recurrenceRule: ' ' }),
    );
    expect(p.get('details')).toBe('Bring a friend');
    expect(p.has('location')).toBe(false);
    expect(p.has('recur')).toBe(false);
  });
});
