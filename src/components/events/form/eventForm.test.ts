import { describe, expect, it } from 'vitest';
import type { ChurchEvent } from '@/types';
import { ApiError } from '@/services/adapter';
import {
  blankValues,
  changedFields,
  collisionRange,
  endAfterStart,
  groupWhenPrivate,
  isEditConflict,
  requestLevelMessages,
  startDayOf,
  toPayload,
  valuesFromEvent,
  withAllDay,
} from './eventForm';

const KIGALI = 'Africa/Kigali'; // UTC+2, no daylight saving
const NEW_YORK = 'America/New_York';

function event(patch: Partial<ChurchEvent>): ChurchEvent {
  return {
    id: 'e1',
    tenantId: 't1',
    title: 'Sunday service',
    type: 'service',
    startDateTime: '2026-03-01T07:00:00Z',
    isRecurring: false,
    status: 'draft',
    attendanceMode: 'individual',
    isPublic: false,
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...patch,
  };
}

describe('valuesFromEvent', () => {
  it('shows the church clock, not the UTC digits', () => {
    const values = valuesFromEvent(event({ endDateTime: '2026-03-01T09:30:00Z' }), KIGALI);
    expect(values.start).toBe('2026-03-01T09:00');
    expect(values.end).toBe('2026-03-01T11:30');
  });

  it('moves the day across midnight in the church zone', () => {
    // 02:00 UTC on the 2nd is 21:00 on the 1st in New York.
    expect(valuesFromEvent(event({ startDateTime: '2026-03-02T02:00:00Z' }), NEW_YORK).start).toBe('2026-03-01T21:00');
  });

  it('shows an all-day event as dates with the last day as the end', () => {
    // 10-12 March in Kigali: midnight 10th (22:00Z on the 9th) to midnight 13th.
    const values = valuesFromEvent(
      event({ isAllDay: true, startDateTime: '2026-03-09T22:00:00Z', endDateTime: '2026-03-12T22:00:00Z' }),
      KIGALI,
    );
    expect(values).toMatchObject({ allDay: true, start: '2026-03-10', end: '2026-03-12' });
  });

  it('leaves the end empty for a one-day all-day event', () => {
    const values = valuesFromEvent(
      event({ isAllDay: true, startDateTime: '2026-03-09T22:00:00Z', endDateTime: '2026-03-10T22:00:00Z' }),
      KIGALI,
    );
    expect(values).toMatchObject({ allDay: true, start: '2026-03-10', end: '' });
  });

  it('reads visibility, falling back to isPublic for older responses', () => {
    expect(valuesFromEvent(event({ visibility: 'private', groupId: 'g1' }), KIGALI)).toMatchObject({
      visibility: 'private',
      groupId: 'g1',
    });
    expect(valuesFromEvent(event({ isPublic: true }), KIGALI).visibility).toBe('public');
    expect(valuesFromEvent(event({ isPublic: false }), KIGALI).visibility).toBe('members');
  });

  it('keeps a rule the builder cannot show', () => {
    const values = valuesFromEvent(event({ isRecurring: true, recurrenceRule: 'FREQ=MONTHLY;BYDAY=5SU' }), KIGALI);
    expect(values.recurrence).toEqual({ kind: 'raw', rule: 'FREQ=MONTHLY;BYDAY=5SU' });
  });
});

describe('toPayload', () => {
  const values = { ...blankValues(), title: '  Sunday service ', start: '2026-03-01T09:00', end: '2026-03-01T11:00' };

  it('sends the input values as they are, with no zone', () => {
    const payload = toPayload(values);
    expect(payload.startDateTime).toBe('2026-03-01T09:00');
    expect(payload.endDateTime).toBe('2026-03-01T11:00');
    expect(payload.title).toBe('Sunday service');
  });

  it('never sends status or isPublic', () => {
    expect(Object.keys(toPayload(values))).not.toContain('status');
    expect(Object.keys(toPayload(values))).not.toContain('isPublic');
  });

  it('sends a null end when there is none, and an empty rule when it does not repeat', () => {
    const payload = toPayload({ ...values, end: '' });
    expect(payload.endDateTime).toBeNull();
    expect(payload.recurrenceRule).toBe('');
  });

  it('sends midnight of the first day and midnight after the last for all-day', () => {
    const payload = toPayload({ ...values, allDay: true, start: '2026-03-10', end: '2026-03-12' });
    expect(payload).toMatchObject({ isAllDay: true, startDateTime: '2026-03-10T00:00', endDateTime: '2026-03-13T00:00' });
  });

  it('carries the day over a month end', () => {
    expect(toPayload({ ...values, allDay: true, start: '2026-03-30', end: '2026-03-31' }).endDateTime).toBe('2026-04-01T00:00');
  });

  it('sends no end for an all-day event with one date', () => {
    expect(toPayload({ ...values, allDay: true, start: '2026-03-10', end: '' }).endDateTime).toBeNull();
  });

  it('sends the visibility and group, and the expected version only when given', () => {
    const payload = toPayload({ ...values, visibility: 'private', groupId: 'g1' }, '2026-01-02T00:00:00Z');
    expect(payload).toMatchObject({ visibility: 'private', groupId: 'g1', expectedUpdatedAt: '2026-01-02T00:00:00Z' });
    expect('expectedUpdatedAt' in toPayload(values)).toBe(false);
    expect(toPayload(values).groupId).toBeNull();
  });

  it('round-trips with valuesFromEvent for an all-day event', () => {
    const sent = toPayload({ ...values, allDay: true, start: '2026-03-10', end: '2026-03-12' });
    // The server stores Kigali midnights.
    const stored = event({
      isAllDay: true,
      startDateTime: '2026-03-09T22:00:00Z',
      endDateTime: '2026-03-12T22:00:00Z',
    });
    expect(sent.endDateTime).toBe('2026-03-13T00:00');
    expect(valuesFromEvent(stored, KIGALI)).toMatchObject({ start: '2026-03-10', end: '2026-03-12' });
  });
});

describe('blankValues and withAllDay', () => {
  it('starts empty, or at 09:00 on the day the calendar passed', () => {
    expect(blankValues().start).toBe('');
    expect(blankValues('2026-03-08').start).toBe('2026-03-08T09:00');
    expect(blankValues('2026-02-30').start).toBe('');
    expect(blankValues('tomorrow').start).toBe('');
  });

  it('defaults to members-only and individual attendance', () => {
    expect(blankValues()).toMatchObject({ visibility: 'members', attendanceMode: 'individual', allDay: false });
  });

  it('turns a date-time into a date and back', () => {
    const timed = { ...blankValues('2026-03-08'), end: '2026-03-08T11:00' };
    const allDay = withAllDay(timed, true);
    expect(allDay).toMatchObject({ allDay: true, start: '2026-03-08', end: '2026-03-08' });
    expect(withAllDay(allDay, false)).toMatchObject({ allDay: false, start: '2026-03-08T09:00', end: '' });
  });

  it('finds the start day for the repeat defaults', () => {
    expect(startDayOf({ start: '2026-03-08T09:00' })).toBe('2026-03-08');
    expect(startDayOf({ start: '' })).toBeNull();
  });
});

describe('collisionRange', () => {
  it('turns the church clock into instants, not the browser clock', () => {
    expect(collisionRange({ allDay: false, start: '2026-03-01T09:00', end: '2026-03-01T11:00' }, KIGALI)).toEqual({
      startDateTime: '2026-03-01T07:00:00.000Z',
      endDateTime: '2026-03-01T09:00:00.000Z',
    });
    expect(collisionRange({ allDay: false, start: '2026-03-01T09:00', end: '' }, NEW_YORK)).toEqual({
      startDateTime: '2026-03-01T14:00:00.000Z',
    });
  });

  it('leaves out an end that is not after the start', () => {
    expect(collisionRange({ allDay: false, start: '2026-03-01T09:00', end: '2026-03-01T08:00' }, KIGALI)).not.toHaveProperty(
      'endDateTime',
    );
  });

  it('spans whole church days for all-day', () => {
    expect(collisionRange({ allDay: true, start: '2026-03-10', end: '2026-03-12' }, KIGALI)).toEqual({
      startDateTime: '2026-03-09T22:00:00.000Z',
      endDateTime: '2026-03-12T22:00:00.000Z',
    });
    expect(collisionRange({ allDay: true, start: '2026-03-10', end: '' }, KIGALI)?.endDateTime).toBe('2026-03-10T22:00:00.000Z');
  });

  it('is null until the start is complete', () => {
    expect(collisionRange({ allDay: false, start: '', end: '' }, KIGALI)).toBeNull();
    expect(collisionRange({ allDay: false, start: '2026-03-01', end: '' }, KIGALI)).toBeNull();
    expect(collisionRange({ allDay: true, start: '', end: '' }, KIGALI)).toBeNull();
  });
});

describe('rules', () => {
  it('endAfterStart', () => {
    const timed = endAfterStart('2026-03-01T09:00', false);
    expect(timed('')).toBeNull();
    expect(timed('2026-03-01T09:01')).toBeNull();
    expect(timed('2026-03-01T09:00')).toMatch(/after the start/);
    expect(timed('2026-02-28T10:00')).toMatch(/after the start/);
    const allDay = endAfterStart('2026-03-10', true);
    expect(allDay('2026-03-10')).toBeNull();
    expect(allDay('2026-03-09')).toMatch(/before the first/);
    expect(endAfterStart('', false)('2026-03-01T09:00')).toBeNull();
  });

  it('groupWhenPrivate', () => {
    expect(groupWhenPrivate('private')('')).toMatch(/Choose the group/);
    expect(groupWhenPrivate('private')('g1')).toBeNull();
    expect(groupWhenPrivate('members')('')).toBeNull();
    expect(groupWhenPrivate('public')('')).toBeNull();
  });
});

describe('changedFields', () => {
  it('names what differs', () => {
    const a = { ...blankValues('2026-03-08'), title: 'A' };
    expect(changedFields(a, { ...a })).toEqual([]);
    expect(changedFields(a, { ...a, title: 'B', start: '2026-03-08T10:00', visibility: 'public' })).toEqual([
      'Title',
      'Date and time',
      'Who can see it',
    ]);
  });

  it('ignores surrounding spaces and compares repeat rules by their rule', () => {
    const a = { ...blankValues(), title: 'A' };
    expect(changedFields(a, { ...a, title: ' A ' })).toEqual([]);
    expect(changedFields(a, { ...a, recurrence: { kind: 'raw', rule: 'FREQ=DAILY' } })).toEqual(['Repeats']);
  });
});

describe('server answers', () => {
  it('recognises an edit conflict', () => {
    expect(isEditConflict(new ApiError(409, 'edit_conflict', 'Someone else changed this'))).toBe(true);
    expect(isEditConflict(new ApiError(409, 'conflict', 'x'))).toBe(false);
    expect(isEditConflict(new Error('x'))).toBe(false);
  });

  it('reads request-level 422 messages and skips field ones', () => {
    const error = new ApiError(422, 'validation_error', 'invalid', {
      fields: [
        { loc: ['body'], msg: 'Value error, The event must end after it starts' },
        { loc: ['body', 'title'], msg: 'Field required' },
      ],
    });
    expect(requestLevelMessages(error)).toEqual(['The event must end after it starts']);
    expect(requestLevelMessages(new Error('x'))).toEqual([]);
  });
});
