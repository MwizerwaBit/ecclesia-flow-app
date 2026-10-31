/**
 * @file calendarState.ts
 * @description The pure logic behind the calendar components: what the URL says
 * about the view, which day the arrow keys move to, which days the agenda asks
 * for. No React and no DOM here, so all of it is covered by calendarState.test.ts.
 *
 * URL contract (what a shared calendar link carries):
 *   ?month=2026-03   the visible month; omitted when it is the current month
 *   &view=agenda     omitted for the month grid
 *   &type=service    CalendarFilters.type
 *   &group=<uuid>    CalendarFilters.groupId
 *   &unit=<uuid>     CalendarFilters.unitId
 *   &status=draft    CalendarFilters.status (staff screens only)
 * Anything malformed (an unknown type or status, an id that is not a UUID) is
 * dropped. Any other parameter on the URL is left alone.
 */
import type { CalendarFilters, CalendarItem, EventStatus, EventType } from '@/types';
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from '@/lib/events';
import {
  addDays,
  addMonths,
  dayKeyOf,
  firstOfMonth,
  isSameMonth,
  parseDayKey,
  weekdayOf,
  type DayKey,
  type WeekStart,
  type YearMonth,
} from '@/lib/calendar';

export type CalendarView = 'month' | 'agenda';

/** How far ahead the agenda looks. The API reads at most 93 days per request. */
export const AGENDA_DAYS = 60;
export const MAX_WINDOW_DAYS = 93;

export type FilterKey = keyof CalendarFilters;
export const ALL_FILTER_KEYS: FilterKey[] = ['type', 'groupId', 'unitId', 'status'];

const FILTER_PARAM: Record<FilterKey, string> = {
  type: 'type',
  groupId: 'group',
  unitId: 'unit',
  status: 'status',
};

const OWN_PARAMS = ['month', 'view', ...Object.values(FILTER_PARAM)];

// ─── URL state ────────────────────────────────────────────────────────────────

export interface CalendarUrlState {
  /** Null when the URL names no month: the caller shows the current month. */
  month: YearMonth | null;
  view: CalendarView;
  filters: CalendarFilters;
}

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ID_PARAM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMonthParam(value: string | null): YearMonth | null {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1970 || year > 2200) return null;
  return { year, month: Number(match[2]) };
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Reads the calendar's state from search params, ignoring anything malformed. */
export function parseCalendarParams(
  params: URLSearchParams,
  filterKeys: FilterKey[] = ALL_FILTER_KEYS,
): CalendarUrlState {
  const filters: CalendarFilters = {};
  for (const key of filterKeys) {
    const raw = params.get(FILTER_PARAM[key]);
    if (!raw) continue;
    if (key === 'type') {
      if (Object.hasOwn(EVENT_TYPE_LABEL, raw)) filters.type = raw as EventType;
    } else if (key === 'status') {
      if (Object.hasOwn(EVENT_STATUS_LABEL, raw)) filters.status = raw as EventStatus;
    } else if (ID_PARAM.test(raw)) {
      filters[key] = raw;
    }
  }
  return {
    month: parseMonthParam(params.get('month')),
    view: params.get('view') === 'agenda' ? 'agenda' : 'month',
    filters,
  };
}

/**
 * A copy of `params` carrying this calendar state. The current month is left
 * out (a link to "this month" should stay "this month" next month), as is the
 * default view; parameters that are not the calendar's are kept.
 */
export function writeCalendarParams(
  params: URLSearchParams,
  state: { month: YearMonth; view: CalendarView; filters: CalendarFilters },
  currentMonth: YearMonth,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const name of OWN_PARAMS) next.delete(name);
  if (!sameMonth(state.month, currentMonth)) next.set('month', formatMonthParam(state.month));
  if (state.view === 'agenda') next.set('view', 'agenda');
  for (const key of ALL_FILTER_KEYS) {
    const value = state.filters[key];
    if (value) next.set(FILTER_PARAM[key], value);
  }
  return next;
}

// ─── Windows ──────────────────────────────────────────────────────────────────

/**
 * The days the agenda asks for: from today when the month shown is the current
 * one, otherwise from the first of that month. Never more than the API's 93.
 */
export function agendaDays(month: YearMonth, today: DayKey, length: number = AGENDA_DAYS): DayKey[] {
  const count = Math.max(1, Math.min(length, MAX_WINDOW_DAYS));
  const start = isSameMonth(today, month) ? today : firstOfMonth(month);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** True when an item overlaps [from, to) (ISO instants). Used to trim stale placeholder data. */
export function overlapsWindow(
  item: Pick<CalendarItem, 'occurrenceStart' | 'occurrenceEnd'>,
  from: string,
  to: string,
): boolean {
  const start = new Date(item.occurrenceStart).getTime();
  const end = item.occurrenceEnd ? new Date(item.occurrenceEnd).getTime() : start;
  return start < new Date(to).getTime() && Math.max(start, end) >= new Date(from).getTime();
}

// ─── Keyboard navigation (ARIA grid) ─────────────────────────────────────────

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The same day of the month `delta` months away, or its last day if that month is shorter. */
export function shiftMonth(day: DayKey, delta: number): DayKey {
  const { year, month, day: d } = parseDayKey(day);
  const target = addMonths({ year, month }, delta);
  return dayKeyOf(target.year, target.month, Math.min(d, daysInMonth(target)));
}

/**
 * Where a key moves the focus from `day`, or null for a key the grid ignores.
 * Arrows step a day or a week; Home/End jump to the first/last day of the week;
 * PageUp/PageDown change month, keeping the day of the month.
 */
export function keyboardTarget(day: DayKey, key: string, weekStart: WeekStart): DayKey | null {
  const lead = (weekdayOf(day) - weekStart + 7) % 7;
  switch (key) {
    case 'ArrowLeft':
      return addDays(day, -1);
    case 'ArrowRight':
      return addDays(day, 1);
    case 'ArrowUp':
      return addDays(day, -7);
    case 'ArrowDown':
      return addDays(day, 7);
    case 'Home':
      return addDays(day, -lead);
    case 'End':
      return addDays(day, 6 - lead);
    case 'PageUp':
      return shiftMonth(day, -1);
    case 'PageDown':
      return shiftMonth(day, 1);
    default:
      return null;
  }
}

/** The grid's one tab stop when nothing has been focused yet: the open day, else today, else the 1st. */
export function defaultFocusDay(month: YearMonth, today: DayKey, selectedDay?: DayKey | null): DayKey {
  if (selectedDay && isSameMonth(selectedDay, month)) return selectedDay;
  if (isSameMonth(today, month)) return today;
  return firstOfMonth(month);
}

// ─── Cells ────────────────────────────────────────────────────────────────────

/** The first `max` items and how many did not fit (for "+N more"). */
export function visibleSlice<T>(items: T[], max: number): { shown: T[]; hidden: number } {
  return { shown: items.slice(0, max), hidden: Math.max(0, items.length - max) };
}

/** "3 events" / "No events", for a day cell's accessible name. */
export function countLabel(count: number): string {
  if (count === 0) return 'No events';
  return count === 1 ? '1 event' : `${count} events`;
}
