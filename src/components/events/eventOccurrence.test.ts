import { describe, expect, it } from 'vitest';
import { nextOccurrence, occurrenceAt } from './eventOccurrence';

const ZONE = 'Africa/Kigali'; // UTC+2, no daylight saving

describe('nextOccurrence', () => {
  it('is the event itself when it does not repeat', () => {
    const event = { startDateTime: '2026-03-08T07:00:00Z', endDateTime: '2026-03-08T09:00:00Z', isAllDay: false };
    expect(nextOccurrence(event, ZONE)).toEqual({
      occurrenceStart: '2026-03-08T07:00:00Z',
      occurrenceEnd: '2026-03-08T09:00:00Z',
      isAllDay: false,
    });
  });

  it('moves the end with the start for a repeating timed event', () => {
    const event = {
      startDateTime: '2026-03-01T07:00:00Z',
      endDateTime: '2026-03-01T09:30:00Z',
      upcomingOccurrences: ['2026-06-07T07:00:00Z', '2026-06-14T07:00:00Z'],
    };
    expect(nextOccurrence(event, ZONE)).toEqual({
      occurrenceStart: '2026-06-07T07:00:00Z',
      occurrenceEnd: '2026-06-07T09:30:00.000Z',
      isAllDay: false,
    });
  });

  it('keeps no end when the event has none', () => {
    const event = { startDateTime: '2026-03-01T07:00:00Z', upcomingOccurrences: ['2026-06-07T07:00:00Z'] };
    expect(nextOccurrence(event, ZONE)?.occurrenceEnd).toBeNull();
  });

  it('prefers the next date the server names over the upcoming list', () => {
    const event = {
      startDateTime: '2026-03-01T07:00:00Z',
      endDateTime: '2026-03-01T09:00:00Z',
      isRecurring: true,
      nextOccurrence: '2027-03-07T07:00:00Z',
      upcomingOccurrences: ['2026-06-07T07:00:00Z'],
    };
    expect(nextOccurrence(event, ZONE)?.occurrenceStart).toBe('2027-03-07T07:00:00Z');
  });

  it('finds a next date past the 120-day list the server sends', () => {
    // A yearly retreat: no upcoming list, but the server names the next date.
    const event = { startDateTime: '2024-10-05T07:00:00Z', isRecurring: true, nextOccurrence: '2027-10-05T07:00:00Z' };
    expect(nextOccurrence(event, ZONE)?.occurrenceStart).toBe('2027-10-05T07:00:00Z');
  });

  it('has no next date for a repeating event that has run out', () => {
    const event = { startDateTime: '2024-03-01T07:00:00Z', isRecurring: true, nextOccurrence: null, upcomingOccurrences: [] };
    expect(nextOccurrence(event, ZONE)).toBeNull();
    expect(nextOccurrence({ startDateTime: '2024-03-01T07:00:00Z', recurrenceRule: 'FREQ=WEEKLY' }, ZONE)).toBeNull();
  });

  it('is the event itself for a one-off even when the server names no next date', () => {
    const event = { startDateTime: '2026-03-08T07:00:00Z', isRecurring: false, nextOccurrence: null };
    expect(nextOccurrence(event, ZONE)?.occurrenceStart).toBe('2026-03-08T07:00:00Z');
  });
});

describe('occurrenceAt', () => {
  it('keeps a multi-day all-day event the same number of days', () => {
    // Mar 10-12 in Kigali (midnights are 22:00Z the evening before), repeating from Jun 9.
    const event = { startDateTime: '2026-03-09T22:00:00Z', endDateTime: '2026-03-12T22:00:00Z', isAllDay: true };
    const next = occurrenceAt(event, '2026-06-08T22:00:00Z', ZONE);
    expect(next.occurrenceEnd).toBe('2026-06-11T22:00:00.000Z');
    expect(next.isAllDay).toBe(true);
  });

  it('counts days in the church zone across a clock change', () => {
    // New York: the clocks go forward on Mar 8 2026, so Mar 7-8 is 47 hours long.
    const zone = 'America/New_York';
    const event = { startDateTime: '2026-03-07T05:00:00Z', endDateTime: '2026-03-09T04:00:00Z', isAllDay: true };
    const next = occurrenceAt(event, '2026-06-06T04:00:00Z', zone);
    expect(next.occurrenceEnd).toBe('2026-06-08T04:00:00.000Z');
  });
});
