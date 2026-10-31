/**
 * @file eventForm.ts
 * @description What the gathering form holds, and how it maps to and from the API.
 *
 * Times stay in the church's own clock. A date-time input holds
 * `YYYY-MM-DDTHH:mm` with no zone, and the API reads exactly that as the church's
 * local time, so the form sends it as it is. Only two things ever need an
 * instant: showing an existing event (instant to church clock) and the
 * collision check (church clock to instant).
 *
 * An all-day gathering is whole church days. The form holds plain dates, the
 * first day and the LAST day; the API stores midnight of the first day and
 * midnight after the last, so the end is moved by one day in each direction.
 */
import type { AttendanceMode, ChurchEvent, EventType, EventVisibility } from '@/types';
import type { EventWrite } from '@/services/eventsService';
import { ApiError } from '@/services/adapter';
import { addDays, dayKeyInZone, startOfDay, toLocalInput, zonedTimeToInstant, type DayKey } from '@/lib/calendar';
import type { Rule } from '@/lib/validation';
import { recurrenceFromRule, ruleFromRecurrence, type RecurrenceValue } from './recurrence';

export interface EventFormValues {
  title: string;
  type: EventType;
  description: string;
  location: string;
  allDay: boolean;
  /** `YYYY-MM-DDTHH:mm` (church time), or `YYYY-MM-DD` when all-day. */
  start: string;
  /** The same format as `start`; for all-day, the last day. '' = no end. */
  end: string;
  recurrence: RecurrenceValue;
  unitId: string;
  groupId: string;
  visibility: EventVisibility;
  attendanceMode: AttendanceMode;
}

/** The time a gathering starts at when it was begun from a calendar day. */
const DEFAULT_START_TIME = '09:00';

export function isDayKey(value: string | null | undefined): value is DayKey {
  return Boolean(value) && /^\d{4}-\d{2}-\d{2}$/.test(value!) && addDays(value!, 0) === value;
}

/** The empty form; `startDay` (from the calendar) fills the start at 09:00. */
export function blankValues(startDay?: string | null): EventFormValues {
  return {
    title: '',
    type: 'service',
    description: '',
    location: '',
    allDay: false,
    start: isDayKey(startDay) ? `${startDay}T${DEFAULT_START_TIME}` : '',
    end: '',
    recurrence: { kind: 'none' },
    unitId: '',
    groupId: '',
    visibility: 'members',
    attendanceMode: 'individual',
  };
}

/** The form for an existing gathering, its instants placed on the church's clock. */
export function valuesFromEvent(event: ChurchEvent, zone: string): EventFormValues {
  const visibility = event.visibility ?? (event.isPublic ? 'public' : 'members');
  const common = {
    title: event.title,
    type: event.type,
    description: event.description ?? '',
    location: event.location ?? '',
    recurrence: recurrenceFromRule(event.recurrenceRule),
    unitId: event.unitId ?? '',
    groupId: event.groupId ?? '',
    visibility,
    attendanceMode: event.attendanceMode,
  };

  if (event.isAllDay) {
    const first = dayKeyInZone(event.startDateTime, zone);
    // The stored end is midnight after the last day; show the last day itself.
    const last = event.endDateTime ? addDays(dayKeyInZone(event.endDateTime, zone), -1) : first;
    return { ...common, allDay: true, start: first, end: last > first ? last : '' };
  }
  return {
    ...common,
    allDay: false,
    start: toLocalInput(event.startDateTime, zone),
    end: event.endDateTime ? toLocalInput(event.endDateTime, zone) : '',
  };
}

/** Switching the all-day toggle keeps the day and drops what no longer fits. */
export function withAllDay(values: EventFormValues, allDay: boolean): EventFormValues {
  if (allDay === values.allDay) return values;
  if (allDay) {
    return { ...values, allDay, start: values.start.slice(0, 10), end: values.end.slice(0, 10) };
  }
  const day = values.start.slice(0, 10);
  return { ...values, allDay, start: day ? `${day}T${DEFAULT_START_TIME}` : '', end: '' };
}

/** The day the first gathering falls on, for the repeat rule's defaults; null until a start is chosen. */
export function startDayOf(values: Pick<EventFormValues, 'start'>): DayKey | null {
  const day = values.start.slice(0, 10);
  return isDayKey(day) ? day : null;
}

// ─── Sending ─────────────────────────────────────────────────────────────────

/** `EventWrite` with the end allowed to be null, which clears it on edit. */
export type EventPayload = Omit<Partial<EventWrite>, 'endDateTime'> & { endDateTime: string | null };

/**
 * The create/update body. There is no status or isPublic: a new gathering is
 * always a draft and who sees it is its visibility. `expectedUpdatedAt` is sent
 * only when editing, so a save from a stale screen is refused, not merged.
 */
export function toPayload(values: EventFormValues, expectedUpdatedAt?: string): EventPayload {
  let startDateTime = values.start;
  let endDateTime: string | null = values.end || null;
  if (values.allDay) {
    startDateTime = `${values.start}T00:00`;
    endDateTime = values.end ? `${addDays(values.end, 1)}T00:00` : null;
  }
  return {
    title: values.title.trim(),
    type: values.type,
    description: values.description.trim(),
    location: values.location.trim(),
    startDateTime,
    endDateTime,
    isAllDay: values.allDay,
    recurrenceRule: ruleFromRecurrence(values.recurrence),
    unitId: values.unitId || null,
    groupId: values.groupId || null,
    visibility: values.visibility,
    attendanceMode: values.attendanceMode,
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
  };
}

/** The window to check for clashing group gatherings, as instants; null until the start is complete. */
export function collisionRange(
  values: Pick<EventFormValues, 'allDay' | 'start' | 'end'>,
  zone: string,
): { startDateTime: string; endDateTime?: string } | null {
  if (values.allDay) {
    if (!isDayKey(values.start)) return null;
    const lastDay = isDayKey(values.end) && values.end >= values.start ? values.end : values.start;
    return {
      startDateTime: startOfDay(values.start, zone).toISOString(),
      endDateTime: startOfDay(addDays(lastDay, 1), zone).toISOString(),
    };
  }
  const start = instantOf(values.start, zone);
  if (!start) return null;
  const end = instantOf(values.end, zone);
  return {
    startDateTime: start.toISOString(),
    ...(end && end.getTime() > start.getTime() ? { endDateTime: end.toISOString() } : {}),
  };
}

function instantOf(local: string, zone: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(local);
  return match && isDayKey(match[1]) ? zonedTimeToInstant(match[1], match[2], zone) : null;
}

// ─── Checking ────────────────────────────────────────────────────────────────

/** The end must come after the start (all-day: on or after the first day). Empty is fine: the end is optional. */
export const endAfterStart =
  (start: string, allDay: boolean): Rule =>
  (end) => {
    if (!end || !start) return null;
    if (allDay) return end >= start ? null : 'The last day can’t be before the first day';
    return end > start ? null : 'The end must be after the start';
  };

/** A private gathering belongs to a group; the API refuses one without. */
export const groupWhenPrivate =
  (visibility: EventVisibility): Rule =>
  (groupId) => (visibility === 'private' && !groupId ? 'Choose the group that can see this gathering' : null);

// ─── Comparing ───────────────────────────────────────────────────────────────

const FIELD_LABELS: Array<[string, (v: EventFormValues) => unknown]> = [
  ['Title', (v) => v.title.trim()],
  ['Type', (v) => v.type],
  ['Description', (v) => v.description.trim()],
  ['Location', (v) => v.location.trim()],
  ['Date and time', (v) => [v.allDay, v.start, v.end]],
  ['Repeats', (v) => ruleFromRecurrence(v.recurrence)],
  ['Branch', (v) => v.unitId],
  ['Group', (v) => v.groupId],
  ['Who can see it', (v) => v.visibility],
  ['Attendance', (v) => v.attendanceMode],
];

/** The names of the fields that differ between two versions of the form. */
export function changedFields(a: EventFormValues, b: EventFormValues): string[] {
  return FIELD_LABELS.filter(([, read]) => JSON.stringify(read(a)) !== JSON.stringify(read(b))).map(([label]) => label);
}

// ─── Server answers ──────────────────────────────────────────────────────────

export function isEditConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.code === 'edit_conflict';
}

/**
 * Whole-request messages the API gave without naming a field, e.g. "The event
 * must end after it starts" (a 422 whose location is just the body).
 */
export function requestLevelMessages(error: unknown): string[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.fields)) return [];
  const out: string[] = [];
  for (const issue of error.fields as Array<{ loc?: unknown[]; msg?: string }>) {
    const named = (issue.loc ?? []).some((part) => typeof part === 'string' && part !== 'body');
    if (named || !issue.msg) continue;
    out.push(issue.msg.replace(/^Value error,\s*/i, '').trim());
  }
  return out;
}
