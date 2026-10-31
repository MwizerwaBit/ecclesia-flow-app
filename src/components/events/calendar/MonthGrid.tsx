/**
 * @file MonthGrid.tsx
 * @description A six-week month grid of calendar items, for every calendar screen.
 *
 * Props contract
 *   month         YearMonth             the month shown (days outside it are muted)
 *   items         T[] (T extends CalendarItem)   the window's occurrences
 *   zone          string                the church's IANA zone: items sit on the
 *                                       church's days, never the browser's
 *   weekStart     0 | 1 = 0             0 = weeks start on Sunday, 1 = Monday
 *   selectedDay   DayKey | null         the day whose panel is open (marked, and
 *                                       focus returns to it when the panel closes)
 *   onSelectDay   (day) => void         a day was opened (click, tap, Enter, Space).
 *                                       The parent shows a DayPanel for it.
 *   onMonthChange (month) => void       keyboard moved focus into another month
 *   hrefFor       (item) => string      makes each chip a link to the item
 *   busy          boolean               dims the grid while a new window loads
 *   chipsFrom     'xl' | '2xl' = '2xl'  the breakpoint from which cells list chips
 *                                       instead of dots. The staff screen has a w-72
 *                                       sidebar from xl, which leaves cells ~97px wide
 *                                       at 1024px, too narrow for a time and a title,
 *                                       so it keeps the default. Screens with no
 *                                       sidebar (member, public) pass 'xl'.
 *
 * Below the chip breakpoint cells are compact (the day number and colored dots),
 * because with the staff sidebar beside it the grid is only ~500px wide at lg.
 * Tapping a day opens its panel. From the breakpoint each cell lists chips with
 * times and titles and a "+N more" button.
 *
 * Accessibility: role="grid" with a roving tabindex (one tab stop). Arrow keys
 * move by day and week, Home/End to the week's first/last day, PageUp/PageDown by
 * month (the month changes via onMonthChange), Enter/Space opens the day. Chips and
 * "+N more" are mouse/touch shortcuts and are not tab stops; the day panel lists
 * every event as real links for keyboard and screen-reader users.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CalendarItem } from '@/types';
import {
  formatDay,
  formatMonth,
  groupByDay,
  isSameMonth,
  monthGrid,
  monthOf,
  todayKey,
  weekdayLabel,
  weekdayOrder,
  type DayKey,
  type WeekStart,
  type YearMonth,
} from '@/lib/calendar';
import { cn } from '@/lib/cn';
import { EventChip } from './EventChip';
import { ACCENT_DOT, itemAccent } from './itemMeta';
import { countLabel, defaultFocusDay, keyboardTarget, visibleSlice } from './calendarState';

const CHIPS_PER_CELL = 3;
const DOTS_PER_CELL = 3;

/**
 * The classes that switch a cell from dots to chips. Tailwind only sees literal
 * class names, so each breakpoint spells its set out in full.
 */
const CHIP_BREAKPOINT = {
  xl: {
    cell: 'xl:min-h-32 xl:items-stretch xl:p-1.5',
    dayNumber: 'xl:self-start',
    dots: 'xl:hidden',
    chips: 'hidden xl:flex',
  },
  '2xl': {
    cell: '2xl:min-h-32 2xl:items-stretch 2xl:p-1.5',
    dayNumber: '2xl:self-start',
    dots: '2xl:hidden',
    chips: 'hidden 2xl:flex',
  },
} as const;

interface MonthGridProps<T extends CalendarItem> {
  month: YearMonth;
  items: T[];
  zone: string;
  weekStart?: WeekStart;
  selectedDay?: DayKey | null;
  onSelectDay: (day: DayKey) => void;
  onMonthChange: (month: YearMonth) => void;
  hrefFor?: (item: T) => string;
  busy?: boolean;
  chipsFrom?: keyof typeof CHIP_BREAKPOINT;
}

export function MonthGrid<T extends CalendarItem>({
  month,
  items,
  zone,
  weekStart = 0,
  selectedDay = null,
  onSelectDay,
  onMonthChange,
  hrefFor,
  busy = false,
  chipsFrom = '2xl',
}: MonthGridProps<T>) {
  const bp = CHIP_BREAKPOINT[chipsFrom];
  const today = todayKey(zone);
  const days = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
  const byDay = useMemo(() => groupByDay(items, zone), [items, zone]);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7)), [days]);

  // The roving tab stop. Only honoured while it is a day this grid shows.
  const [focusDay, setFocusDay] = useState<DayKey | null>(null);
  const activeDay = focusDay && days.includes(focusDay) ? focusDay : defaultFocusDay(month, today, selectedDay);

  const gridRef = useRef<HTMLDivElement>(null);
  // Where keyboard focus is headed. A PageUp/PageDown target may not be in this
  // month's grid yet, so it is kept until the cell exists.
  const pendingFocus = useRef<DayKey | null>(null);

  const focusCell = (day: DayKey) => {
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${day}"]`)?.focus();
  };

  // After a keyboard move (which may have changed the month), put DOM focus on the new cell.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target && gridRef.current?.querySelector(`[data-day="${target}"]`)) {
      pendingFocus.current = null;
      focusCell(target);
    }
  });

  // Closing the day panel drops focus to <body>; hand it back to the day that was open.
  const previousSelected = useRef<DayKey | null>(null);
  useEffect(() => {
    const closed = previousSelected.current && !selectedDay;
    if (closed && document.activeElement === document.body) focusCell(previousSelected.current as DayKey);
    previousSelected.current = selectedDay;
  }, [selectedDay]);

  const onKeyDown = (day: DayKey) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return; // a key on a chip belongs to the chip
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFocusDay(day);
      onSelectDay(day);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = keyboardTarget(day, event.key, weekStart);
    if (!target) return;
    event.preventDefault();
    pendingFocus.current = target;
    setFocusDay(target);
    if (!isSameMonth(target, month)) onMonthChange(monthOf(target));
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={formatMonth(month)}
      aria-busy={busy}
      className={cn(
        'flex flex-col gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 transition-opacity dark:border-slate-700 dark:bg-slate-700',
        busy && 'opacity-60',
      )}
    >
      <div role="row" className="grid grid-cols-7 gap-px">
        {weekdayOrder(weekStart).map((weekday) => (
          <div
            key={weekday}
            role="columnheader"
            aria-label={weekdayLabel(weekday, 'long')}
            className="bg-slate-50 py-2 text-center text-caption font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {weekdayLabel(weekday, 'short')}
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <div key={week[0]} role="row" className="grid grid-cols-7 gap-px">
          {week.map((day) => {
            const dayItems = byDay.get(day) ?? [];
            const inMonth = isSameMonth(day, month);
            const isToday = day === today;
            const dots = visibleSlice(dayItems, DOTS_PER_CELL);
            const chips = visibleSlice(dayItems, CHIPS_PER_CELL);
            const dayNumber = Number(day.slice(8));

            return (
              <div
                key={day}
                role="gridcell"
                data-day={day}
                tabIndex={day === activeDay ? 0 : -1}
                aria-selected={day === selectedDay}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}${isToday ? ', today' : ''}. ${countLabel(dayItems.length)}`}
                onKeyDown={onKeyDown(day)}
                onFocus={(e) => {
                  if (e.target !== e.currentTarget) return;
                  pendingFocus.current = null;
                  setFocusDay(day);
                }}
                onClick={() => {
                  setFocusDay(day);
                  onSelectDay(day);
                }}
                className={cn(
                  'flex min-h-14 cursor-pointer flex-col items-center gap-1 p-1 outline-none transition-colors',
                  'focus-visible:relative focus-visible:z-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  bp.cell,
                  inMonth
                    ? 'bg-surface hover:bg-slate-50 dark:bg-surface-dark dark:hover:bg-slate-800/60'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
                  day === selectedDay && 'bg-primary-light/40 dark:bg-primary/10',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold tabular-nums',
                    bp.dayNumber,
                    isToday
                      ? 'bg-primary text-white'
                      : inMonth
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400',
                  )}
                  aria-hidden
                >
                  {dayNumber}
                </span>

                {/* Phones and tablets: dots, the count when there are more. */}
                {dayItems.length > 0 && (
                  <span className={cn('flex flex-wrap items-center justify-center gap-0.5', bp.dots)} aria-hidden>
                    {dots.shown.map((item, i) => (
                      <span key={`${item.eventId}-${i}`} className={cn('size-1.5 rounded-full', ACCENT_DOT[itemAccent(item)])} />
                    ))}
                    {dots.hidden > 0 && (
                      <span className="text-[10px] font-bold leading-none text-slate-500 dark:text-slate-400">+{dots.hidden}</span>
                    )}
                  </span>
                )}

                {/* Wide screens: chips. Clicks on a chip open the event, not the day. */}
                {dayItems.length > 0 && (
                  <div className={cn('min-w-0 flex-col gap-1', bp.chips)} onClick={(e) => e.stopPropagation()}>
                    {chips.shown.map((item, i) => (
                      <EventChip
                        key={`${item.eventId}-${item.occurrenceStart}-${i}`}
                        item={item}
                        day={day}
                        zone={zone}
                        href={hrefFor?.(item)}
                        tabIndex={-1}
                      />
                    ))}
                    {chips.hidden > 0 && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setFocusDay(day);
                          onSelectDay(day);
                        }}
                        className="rounded-md px-1.5 py-1 text-left text-caption font-semibold text-primary hover:bg-primary-light/50 dark:hover:bg-primary/10"
                      >
                        +{chips.hidden} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
