/**
 * @file recurrence.ts
 * @description Repeat rules for gatherings: build, read and describe the subset
 * of RRULE the API accepts.
 *
 * The API accepts FREQ (DAILY/WEEKLY/MONTHLY/YEARLY), INTERVAL 1-52, BYDAY,
 * BYMONTHDAY, COUNT 1-366 and UNTIL, and rejects everything else. The form
 * edits a structured `RecurrenceState` instead of a string, so a person never
 * types a rule and never meets a syntax error. A rule saved some other way
 * that this builder cannot represent is kept as `raw` and shown read-only;
 * it is never reinterpreted, so nothing is silently lost.
 */
import { addDays, parseDayKey, weekdayLabel, weekdayOf, type DayKey } from '@/lib/calendar';
import { describeRecurrence } from '../workflow/recurrence';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
/** 'start' = no day was given, so each month repeats on the start date's day. */
export type MonthlyMode = 'start' | 'day' | 'weekday';
export type RecurrenceEnd = 'never' | 'until' | 'count';
/** 1 = first ... 4 = fourth, -1 = last. */
export type Ordinal = 1 | 2 | 3 | 4 | -1;

export interface RecurrenceState {
  freq: Frequency;
  /** Every N days / weeks / months / years (1-52). */
  interval: number;
  /** Weekly: weekdays, 0 = Sunday. Empty = the start date's weekday. */
  weekdays: number[];
  monthlyMode: MonthlyMode;
  /** Monthly "on day N", 1-31. */
  monthDay: number;
  /** Monthly "on the first/…/last <weekday>". */
  ordinal: Ordinal;
  ordinalWeekday: number;
  end: RecurrenceEnd;
  /** `YYYY-MM-DD`, or '' while no date is chosen. */
  until: string;
  /** 1-366. */
  count: number;
}

/** What the form holds for the "Repeats" field. */
export type RecurrenceValue =
  | { kind: 'none' }
  | { kind: 'builder'; state: RecurrenceState }
  /** A rule the builder cannot represent, kept exactly as stored. */
  | { kind: 'raw'; rule: string };

export const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
export const ORDINALS: Ordinal[] = [1, 2, 3, 4, -1];
export const ORDINAL_LABEL: Record<Ordinal, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' };
export const MAX_INTERVAL = 52;
export const MAX_COUNT = 366;

/** RRULE weekday codes, indexed 0 = Sunday. */
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ─── Building ────────────────────────────────────────────────────────────────

/** The RRULE string for a state. Settings that do not apply to the frequency are left out. */
export function buildRule(state: RecurrenceState): string {
  const parts = [`FREQ=${state.freq}`];
  if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);
  if (state.freq === 'WEEKLY' && state.weekdays.length > 0) {
    const days = [...new Set(state.weekdays)].sort((a, b) => a - b);
    parts.push(`BYDAY=${days.map((d) => DAY_CODES[d]).join(',')}`);
  }
  if (state.freq === 'MONTHLY') {
    if (state.monthlyMode === 'day') parts.push(`BYMONTHDAY=${state.monthDay}`);
    if (state.monthlyMode === 'weekday') parts.push(`BYDAY=${state.ordinal}${DAY_CODES[state.ordinalWeekday]}`);
  }
  // UNTIL and COUNT are mutually exclusive: only the chosen ending is written.
  if (state.end === 'until' && state.until) parts.push(`UNTIL=${state.until.replaceAll('-', '')}`);
  if (state.end === 'count') parts.push(`COUNT=${state.count}`);
  return parts.join(';');
}

// ─── Reading ─────────────────────────────────────────────────────────────────

const WEEKDAY_CODE = /^(SU|MO|TU|WE|TH|FR|SA)$/;
const ORDINAL_DAY = /^(-1|[1-4])(SU|MO|TU|WE|TH|FR|SA)$/;

function validDayKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && addDays(key, 0) === key;
}

function parseCount(value: string, max: number): number | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

/**
 * The state for a rule, or null when the builder cannot represent it exactly
 * (another key, an ordinal weekday on a weekly rule, UNTIL with a time, a fifth
 * Sunday, both COUNT and UNTIL, an out-of-range number, ...).
 */
export function parseRule(rule: string): RecurrenceState | null {
  const parts = new Map<string, string>();
  for (const item of rule.trim().toUpperCase().replace(/^RRULE:/, '').split(';')) {
    if (!item) continue;
    const [key, value, ...rest] = item.split('=');
    if (!key || value === undefined || rest.length > 0 || parts.has(key)) return null;
    parts.set(key, value);
  }
  for (const key of parts.keys()) {
    if (!['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL'].includes(key)) return null;
  }

  const freq = parts.get('FREQ') as Frequency | undefined;
  if (!freq || !FREQUENCIES.includes(freq)) return null;

  const state: RecurrenceState = {
    freq,
    interval: 1,
    weekdays: [],
    monthlyMode: 'start',
    monthDay: 1,
    ordinal: 1,
    ordinalWeekday: 0,
    end: 'never',
    until: '',
    count: 10,
  };

  if (parts.has('INTERVAL')) {
    const interval = parseCount(parts.get('INTERVAL')!, MAX_INTERVAL);
    if (interval === null) return null;
    state.interval = interval;
  }

  const byDay = parts.get('BYDAY');
  const byMonthDay = parts.get('BYMONTHDAY');
  if (freq === 'WEEKLY') {
    if (byMonthDay !== undefined) return null;
    if (byDay !== undefined) {
      const codes = byDay.split(',');
      if (!codes.every((c) => WEEKDAY_CODE.test(c)) || new Set(codes).size !== codes.length) return null;
      state.weekdays = codes.map((c) => DAY_CODES.indexOf(c)).sort((a, b) => a - b);
    }
  } else if (freq === 'MONTHLY') {
    if (byDay !== undefined && byMonthDay !== undefined) return null;
    if (byMonthDay !== undefined) {
      const day = parseCount(byMonthDay, 31);
      if (day === null) return null;
      state.monthlyMode = 'day';
      state.monthDay = day;
    } else if (byDay !== undefined) {
      const match = ORDINAL_DAY.exec(byDay);
      if (!match) return null;
      state.monthlyMode = 'weekday';
      state.ordinal = Number(match[1]) as Ordinal;
      state.ordinalWeekday = DAY_CODES.indexOf(match[2]);
    }
  } else if (byDay !== undefined || byMonthDay !== undefined) {
    return null;
  }

  const until = parts.get('UNTIL');
  const count = parts.get('COUNT');
  if (until !== undefined && count !== undefined) return null;
  if (until !== undefined) {
    if (!/^\d{8}$/.test(until)) return null;
    const day = `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`;
    if (!validDayKey(day)) return null;
    state.end = 'until';
    state.until = day;
  }
  if (count !== undefined) {
    const n = parseCount(count, MAX_COUNT);
    if (n === null) return null;
    state.end = 'count';
    state.count = n;
  }
  return state;
}

/** The form value for a stored rule: nothing, a builder state, or the rule kept as it is. */
export function recurrenceFromRule(rule: string | null | undefined): RecurrenceValue {
  if (!rule?.trim()) return { kind: 'none' };
  const state = parseRule(rule);
  return state ? { kind: 'builder', state } : { kind: 'raw', rule };
}

/** The rule to send: '' for "does not repeat", which clears a series on edit. */
export function ruleFromRecurrence(value: RecurrenceValue): string {
  if (value.kind === 'none') return '';
  return value.kind === 'raw' ? value.rule : buildRule(value.state);
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/** "The second Sunday" of the start date's month; a fifth is "the last". */
function ordinalOf(day: number): Ordinal {
  const nth = Math.ceil(day / 7);
  return nth > 4 ? -1 : (nth as Ordinal);
}

/**
 * A new rule, forever. It names no weekday and no day of the month (weekdays
 * stay empty, monthly mode 'start'), so the server repeats it on whatever day the
 * first gathering falls on and keeps following it if the start date changes. The
 * day, ordinal and weekday are only what the controls offer when the person
 * switches to choosing their own.
 */
export function defaultRecurrence(startDay: DayKey | null, freq: Frequency = 'WEEKLY'): RecurrenceState {
  const weekday = startDay ? weekdayOf(startDay) : 0;
  const dayOfMonth = startDay ? parseDayKey(startDay).day : 1;
  return {
    freq,
    interval: 1,
    weekdays: [],
    monthlyMode: 'start',
    monthDay: dayOfMonth,
    ordinal: ordinalOf(dayOfMonth),
    ordinalWeekday: weekday,
    end: 'never',
    until: '',
    count: 10,
  };
}

/** The same series moved to another frequency, keeping interval and ending. */
export function withFrequency(state: RecurrenceState, freq: Frequency, startDay: DayKey | null): RecurrenceState {
  const base = defaultRecurrence(startDay, freq);
  return { ...base, interval: state.interval, end: state.end, until: state.until, count: state.count };
}

// ─── Checking ────────────────────────────────────────────────────────────────

/** What is wrong with the rule, in words, or null when it can be saved. */
export function recurrenceProblem(value: RecurrenceValue, startDay: DayKey | null): string | null {
  if (value.kind !== 'builder') return null;
  const { interval, count, end, until, freq, monthlyMode, monthDay } = value.state;
  if (!Number.isInteger(interval) || interval < 1 || interval > MAX_INTERVAL) {
    return `Repeat every a number from 1 to ${MAX_INTERVAL}`;
  }
  if (freq === 'MONTHLY' && monthlyMode === 'day' && (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31)) {
    return 'Choose a day of the month from 1 to 31';
  }
  if (end === 'count' && (!Number.isInteger(count) || count < 1 || count > MAX_COUNT)) {
    return `A series can repeat from 1 to ${MAX_COUNT} times`;
  }
  if (end === 'until') {
    if (!validDayKey(until)) return 'Pick the date the repeating ends';
    if (startDay && until < startDay) return 'The repeating can’t end before the first gathering';
  }
  return null;
}

// ─── Describing ──────────────────────────────────────────────────────────────

/**
 * The rule in plain words, for the form's live preview: "Every other Sunday, until Dec 31, 2026".
 * It builds the rule and hands it to the describer the detail pages use
 * (workflow/recurrence.ts), so the preview and the saved gathering read the same.
 */
export function describeState(state: RecurrenceState, startDay: DayKey | null): string {
  return describeRecurrence(buildRule(state), undefined, startDay);
}

// ─── Start date vs. rule ─────────────────────────────────────────────────────

function daysInMonthOf(day: DayKey): number {
  const { year, month } = parseDayKey(day);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Whether `day` is the `ordinal`-th `weekday` of its month (-1 = the last one). */
function isOrdinalWeekday(day: DayKey, ordinal: Ordinal, weekday: number): boolean {
  if (weekdayOf(day) !== weekday) return false;
  const { day: d } = parseDayKey(day);
  return ordinal === -1 ? d + 7 > daysInMonthOf(day) : Math.ceil(d / 7) === ordinal;
}

/**
 * A warning when the first gathering is not one of the rule's own days. The
 * server repeats a rule only on the days it names, so such a start date is never
 * itself an occurrence (a Wednesday start on a "Sundays" rule). A rule that names
 * no day follows the start date and never triggers this. Null when all is well.
 */
export function startDayMismatch(state: RecurrenceState, startDay: DayKey | null): string | null {
  if (!startDay) return null;
  const weekday = weekdayOf(startDay);
  const dayOfMonth = parseDayKey(startDay).day;

  if (state.freq === 'WEEKLY' && state.weekdays.length > 0 && !state.weekdays.includes(weekday)) {
    return `The first gathering is on a ${weekdayLabel(weekday, 'long')}, which isn’t one of the days chosen, so it won’t be part of the series.`;
  }
  if (state.freq === 'MONTHLY') {
    if (state.monthlyMode === 'day' && state.monthDay !== dayOfMonth) {
      return `The first gathering is on day ${dayOfMonth}, not day ${state.monthDay}, so it won’t be part of the series.`;
    }
    if (state.monthlyMode === 'weekday' && !isOrdinalWeekday(startDay, state.ordinal, state.ordinalWeekday)) {
      return `The first gathering isn’t on the ${ORDINAL_LABEL[state.ordinal]} ${weekdayLabel(state.ordinalWeekday, 'long')} of its month, so it won’t be part of the series.`;
    }
  }
  return null;
}
