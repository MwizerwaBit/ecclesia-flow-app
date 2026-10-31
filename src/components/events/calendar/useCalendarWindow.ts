/**
 * @file useCalendarWindow.ts
 * @description All the state a calendar screen needs, in one hook: the visible
 * month, the view (month grid or agenda), the open day, the filters, and the
 * react-query call for the window those imply.
 *
 * The month, view and filters live in the URL search params (see calendarState.ts
 * for the format), not in component state: a calendar link can be shared, and the
 * back button steps through months. The open day is plain state (it is a sheet).
 *
 * Usage
 *   const cal = useCalendarWindow<CalendarOccurrence>({
 *     scope: 'staff',
 *     source: (from, to, filters) => eventsService.calendar(from, to, filters),
 *   });
 *
 * Options
 *   scope        string   part of the cache key, so staff, member and public windows
 *                         never share data: 'staff', 'member', `public:${slug}`
 *   source       (from, to, filters) => Promise<{ timezone, truncated, occurrences }>
 *                         from/to are ISO instants; CalendarWindow and
 *                         PublicCalendarWindow both fit
 *   filterKeys   which CalendarFilters keys this screen offers (default all); the
 *                         others are ignored when read from the URL. Pass a stable
 *                         array (a module constant), not an inline literal
 *   weekStart    0 | 1    default 0 (Sunday)
 *   enabled      boolean  hold the request (e.g. until a slug is known)
 *   profileZone  boolean  default true: until the first response names the church's
 *                         zone, ask the church profile for it (staff and member
 *                         screens, which are signed in). The public screen passes
 *                         false: that request needs a sign-in and would always 401,
 *                         so the first window is placed in the browser's zone and
 *                         re-keyed once the response names the church's
 *
 * Returns
 *   view, setView            'month' | 'agenda'
 *   month, title             the visible YearMonth and the toolbar title ("March 2026";
 *                            in the agenda, "Next 60 days" or "From April 1, 2026")
 *   goPrev, goNext, goToday, setMonth      month navigation (each is a history step)
 *   filters, setFilter(key, value|undefined), clearFilters, hasFilters
 *   selectedDay, selectDay(day), closeDay  the day whose panel is open
 *   timezone                 the church's zone: the response's, else the profile's, else the browser's
 *   today                    today's DayKey in that zone
 *   weekStart                as given
 *   range                    { first, last } the days the window covers (pass to AgendaList)
 *   items                    the occurrences (T[]); never stale ones from another window
 *   truncated                the API had more than it returned: show <TruncatedNotice />
 *   isLoading                nothing to show yet (first load): show the Skeleton
 *   isRefreshing             a window is loading while the previous one stays on screen
 *   error, refetch           a failed load and its retry
 *
 * The window: the month view asks for the 42-day grid (so the muted days that
 * spill into the neighbouring months are filled in); the agenda asks for 60 days
 * from today, or from the first of the chosen month when that is not the current
 * month. The previous window's data stays up while the next one loads.
 */
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CalendarFilters, CalendarItem } from '@/types';
import {
  addMonths,
  formatDay,
  formatMonth,
  monthGrid,
  monthOf,
  resolveZone,
  todayKey,
  windowForDays,
  type DayKey,
  type WeekStart,
  type YearMonth,
} from '@/lib/calendar';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import {
  AGENDA_DAYS,
  ALL_FILTER_KEYS,
  agendaDays,
  overlapsWindow,
  parseCalendarParams,
  sameMonth,
  writeCalendarParams,
  type CalendarView,
  type FilterKey,
} from './calendarState';

/** What every calendar endpoint returns (CalendarWindow, PublicCalendarWindow). */
export interface CalendarSourceWindow<T extends CalendarItem> {
  timezone: string;
  truncated: boolean;
  occurrences: T[];
}

export interface UseCalendarWindowOptions<T extends CalendarItem> {
  scope: string;
  source: (from: string, to: string, filters: CalendarFilters) => Promise<CalendarSourceWindow<T>>;
  filterKeys?: FilterKey[];
  weekStart?: WeekStart;
  enabled?: boolean;
  profileZone?: boolean;
}

const NO_ITEMS: never[] = [];

export function useCalendarWindow<T extends CalendarItem>({
  scope,
  source,
  filterKeys = ALL_FILTER_KEYS,
  weekStart = 0,
  enabled = true,
  profileZone = true,
}: UseCalendarWindowOptions<T>) {
  const [params, setParams] = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  // The zone the window is placed in. Until the first response (or the profile)
  // names the church's zone it is the browser's; the window then re-keys once.
  const [knownZone, setKnownZone] = useState<string | null>(null);
  // useChurchTimeZone only calls the profile while it has no zone to go on, so
  // handing it the browser's zone (profileZone: false) keeps that request off.
  const timezone = useChurchTimeZone(knownZone ?? (profileZone ? null : resolveZone(null)));
  const today = todayKey(timezone);
  const currentMonth = monthOf(today);

  const url = useMemo(() => parseCalendarParams(params, filterKeys), [params, filterKeys]);
  const month = url.month ?? currentMonth;
  const { view, filters } = url;

  const days = useMemo(
    () => (view === 'month' ? monthGrid(month, weekStart) : agendaDays(month, today, AGENDA_DAYS)),
    [view, month, weekStart, today],
  );
  const { from, to } = useMemo(() => windowForDays(days, timezone), [days, timezone]);

  const query = useQuery({
    queryKey: ['events', 'calendar', scope, from, to, filters],
    queryFn: () => source(from, to, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

  // Remember the zone the server named so every later window is placed in it.
  const responseZone = query.data?.timezone ?? null;
  if (responseZone && responseZone !== knownZone) setKnownZone(responseZone);

  // ─── URL writers ────────────────────────────────────────────────────────────
  const update = useCallback(
    (patch: Partial<{ month: YearMonth; view: CalendarView; filters: CalendarFilters }>, replace = false) => {
      setParams(
        (previous) => {
          const current = parseCalendarParams(previous, filterKeys);
          return writeCalendarParams(
            previous,
            {
              month: patch.month ?? current.month ?? currentMonth,
              view: patch.view ?? current.view,
              filters: patch.filters ?? current.filters,
            },
            currentMonth,
          );
        },
        { replace },
      );
    },
    [setParams, filterKeys, currentMonth],
  );

  const setMonth = useCallback((next: YearMonth) => update({ month: next }), [update]);
  const goPrev = useCallback(() => update({ month: addMonths(month, -1) }), [update, month]);
  const goNext = useCallback(() => update({ month: addMonths(month, 1) }), [update, month]);
  const goToday = useCallback(() => update({ month: currentMonth }), [update, currentMonth]);
  const setView = useCallback((next: CalendarView) => update({ view: next }), [update]);

  const setFilter = useCallback(
    (key: keyof CalendarFilters, value: string | undefined) => {
      const next: CalendarFilters = { ...filters };
      if (value) (next as Record<string, string>)[key] = value;
      else delete next[key];
      update({ filters: next }, true);
    },
    [update, filters],
  );
  const clearFilters = useCallback(() => update({ filters: {} }, true), [update]);
  const closeDay = useCallback(() => setSelectedDay(null), []);

  // ─── What to show ───────────────────────────────────────────────────────────
  // While the next window loads, the previous one's data is kept; drop whatever
  // lies outside the window now asked for so the agenda never lists the wrong weeks.
  const items = useMemo<T[]>(() => {
    const all = query.data?.occurrences ?? (NO_ITEMS as T[]);
    return query.isPlaceholderData ? all.filter((item) => overlapsWindow(item, from, to)) : all;
  }, [query.data, query.isPlaceholderData, from, to]);

  const title =
    view === 'month'
      ? formatMonth(month)
      : sameMonth(month, currentMonth)
        ? `Next ${AGENDA_DAYS} days`
        : `From ${formatDay(days[0], { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return {
    view,
    setView,
    month,
    title,
    goPrev,
    goNext,
    goToday,
    setMonth,
    filters,
    setFilter,
    clearFilters,
    hasFilters: Object.keys(filters).length > 0,
    selectedDay,
    selectDay: setSelectedDay,
    closeDay,
    timezone,
    today,
    weekStart,
    range: { first: days[0], last: days[days.length - 1] },
    items,
    truncated: query.data?.truncated ?? false,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    // A failed refresh leaves the last good data on screen; only an empty failure is an error.
    error: query.data === undefined ? query.error : null,
    refetch: query.refetch,
  };
}
