/**
 * @file ReadOnlyCalendar.tsx
 * @description The calendar body the member portal and the public church page
 * share: toolbar, filters, then loading / error / month grid / agenda, and the
 * day panel. Neither audience edits anything, so there are no actions.
 *
 * Props contract
 *   cal          the object useCalendarWindow returned (the screen owns the hook,
 *                because its source and scope are what differ)
 *   hrefFor      (item) => string   where an event opens
 *   filters      ReactNode          normally <CalendarFilterBar />; omit for none
 *   agendaEmpty  { title, description }   the agenda when nothing is scheduled
 *   monthEmpty   string             the quiet line under an empty month grid
 *   dayEmpty     string             the day panel when the day has nothing
 *
 * A polite status line (screen readers only) says how many events the window
 * holds, so a filter or month change is heard as well as seen.
 */
import { type ReactNode } from 'react';
import type { CalendarItem } from '@/types';
import {
  AgendaList,
  CalendarEmptyNote,
  CalendarError,
  CalendarLoading,
  CalendarToolbar,
  DayPanel,
  MonthGrid,
  TruncatedNotice,
  type useCalendarWindow,
} from '@/components/events/calendar';

type CalendarState<T extends CalendarItem> = ReturnType<typeof useCalendarWindow<T>>;

interface ReadOnlyCalendarProps<T extends CalendarItem> {
  cal: CalendarState<T>;
  hrefFor: (item: T) => string;
  filters?: ReactNode;
  agendaEmpty: { title: string; description: string };
  monthEmpty: string;
  dayEmpty?: string;
  /** Where the agenda's sticky day headings stick (a `top-*` class); lower it under a sticky site header. */
  agendaStickyOffset?: string;
}

export function ReadOnlyCalendar<T extends CalendarItem>({
  cal,
  hrefFor,
  filters,
  agendaEmpty,
  monthEmpty,
  dayEmpty = 'Nothing is scheduled on this day.',
  agendaStickyOffset,
}: ReadOnlyCalendarProps<T>) {
  const settled = !cal.isLoading && !cal.error;

  return (
    <>
      <CalendarToolbar
        title={cal.title}
        view={cal.view}
        onViewChange={cal.setView}
        onPrev={cal.goPrev}
        onNext={cal.goNext}
        onToday={cal.goToday}
        busy={cal.isRefreshing && !cal.isLoading}
        filters={filters}
      />

      {cal.truncated && <TruncatedNotice />}

      {settled && (
        <p role="status" className="sr-only">
          {cal.items.length === 1 ? '1 event' : `${cal.items.length} events`} shown
        </p>
      )}

      {cal.error ? (
        <CalendarError error={cal.error} onRetry={() => void cal.refetch()} />
      ) : cal.isLoading ? (
        <CalendarLoading view={cal.view} />
      ) : cal.view === 'month' ? (
        <>
          <MonthGrid
            month={cal.month}
            items={cal.items}
            zone={cal.timezone}
            weekStart={cal.weekStart}
            selectedDay={cal.selectedDay}
            onSelectDay={cal.selectDay}
            onMonthChange={cal.setMonth}
            hrefFor={hrefFor}
            busy={cal.isRefreshing}
            chipsFrom="xl"
          />
          {cal.items.length === 0 && !cal.isRefreshing && <CalendarEmptyNote>{monthEmpty}</CalendarEmptyNote>}
        </>
      ) : (
        <AgendaList
          items={cal.items}
          zone={cal.timezone}
          range={cal.range}
          hrefFor={hrefFor}
          busy={cal.isRefreshing}
          stickyOffset={agendaStickyOffset}
          emptyTitle={agendaEmpty.title}
          emptyDescription={agendaEmpty.description}
        />
      )}

      <DayPanel
        day={cal.selectedDay}
        items={cal.items}
        zone={cal.timezone}
        onClose={cal.closeDay}
        hrefFor={hrefFor}
        emptyText={dayEmpty}
      />
    </>
  );
}
