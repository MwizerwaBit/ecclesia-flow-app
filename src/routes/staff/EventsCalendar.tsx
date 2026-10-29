/**
 * @file EventsCalendar.tsx
 * @description The staff calendar: every gathering in scope on a month grid or as
 * an agenda, drafts and items waiting for review included (the server decides what
 * this viewer may see; nothing is filtered here).
 *
 * The month, view and filters live in the URL, so a link to a calendar view can be
 * shared. A day opens in a panel listing its events with a shortcut to add a
 * gathering on that day (the form reads ?start=YYYY-MM-DD). The components come
 * from components/events/calendar and are shared with the member and public calendars.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import type { CalendarOccurrence } from '@/types';
import { eventsService } from '@/services/eventsService';
import { groupsService } from '@/services/groupsService';
import { commsService } from '@/services/commsService';
import { useRole } from '@/hooks/useRole';
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from '@/lib/events';
import { formatDay } from '@/lib/calendar';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { TimeZoneNotice } from '@/components/events/TimeZoneNotice';
import {
  AgendaList,
  CalendarEmptyNote,
  CalendarError,
  CalendarFilterBar,
  CalendarLoading,
  CalendarToolbar,
  DayPanel,
  MonthGrid,
  TruncatedNotice,
  useCalendarWindow,
} from '@/components/events/calendar';

const TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(EVENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const hrefFor = (item: CalendarOccurrence) => `/staff/events/${item.eventId}`;
const sourceFor = (from: string, to: string, filters: Parameters<typeof eventsService.calendar>[2]) =>
  eventsService.calendar(from, to, filters);

export function EventsCalendar() {
  const navigate = useNavigate();
  const { can } = useRole();
  const canCreate = can('events:create');

  const cal = useCalendarWindow<CalendarOccurrence>({ scope: 'staff', source: sourceFor });

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => groupsService.list() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });
  const groupOptions = useMemo(() => groups.map((g) => ({ value: g.id, label: g.name })), [groups]);
  // One branch has nothing to filter between.
  const unitOptions = useMemo(
    () => (units.length > 1 ? units.map((u) => ({ value: u.id, label: u.name })) : []),
    [units],
  );

  const newGathering = (day?: string) => navigate(day ? `/staff/events/new?start=${day}` : '/staff/events/new');
  const settled = !cal.isLoading && !cal.error && !cal.isRefreshing;
  const nothingText = cal.hasFilters ? 'No gatherings match these filters.' : 'No gatherings this month.';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <Link
        to="/staff/events"
        className="mb-2 -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-body-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft size={16} aria-hidden />
        All gatherings
      </Link>

      <PageHeader
        title="Calendar"
        description="Services, meetings and events by date, including drafts and those waiting for review."
        actionsOnMobile
        actions={
          canCreate && (
            <Button leftIcon={Plus} onClick={() => newGathering()}>
              New gathering
            </Button>
          )
        }
      />

      <TimeZoneNotice zone={cal.timezone} className="mb-4" />

      <CalendarToolbar
        title={cal.title}
        view={cal.view}
        onViewChange={cal.setView}
        onPrev={cal.goPrev}
        onNext={cal.goNext}
        onToday={cal.goToday}
        busy={cal.isRefreshing && !cal.isLoading}
        filters={
          <CalendarFilterBar
            value={cal.filters}
            onChange={cal.setFilter}
            onClear={cal.clearFilters}
            typeOptions={TYPE_OPTIONS}
            groupOptions={groupOptions}
            unitOptions={unitOptions}
            statusOptions={STATUS_OPTIONS}
          />
        }
      />

      {cal.truncated && <TruncatedNotice />}

      {/* Always mounted, so a screen reader hears a filter or month change; only its text changes. */}
      <p role="status" className="sr-only">
        {settled ? `${cal.items.length === 1 ? '1 gathering' : `${cal.items.length} gatherings`} shown` : ''}
      </p>

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
          />
          {cal.items.length === 0 && !cal.isRefreshing && <CalendarEmptyNote>{nothingText}</CalendarEmptyNote>}
        </>
      ) : (
        <AgendaList
          items={cal.items}
          zone={cal.timezone}
          range={cal.range}
          hrefFor={hrefFor}
          busy={cal.isRefreshing}
          emptyTitle={cal.hasFilters ? 'Nothing matches these filters' : 'No upcoming gatherings'}
          emptyDescription={
            cal.hasFilters
              ? 'Try removing a filter.'
              : 'Create a gathering and your congregation will see it here.'
          }
          emptyAction={
            canCreate && !cal.hasFilters ? (
              <Button leftIcon={Plus} onClick={() => newGathering()}>
                New gathering
              </Button>
            ) : undefined
          }
        />
      )}

      <DayPanel
        day={cal.selectedDay}
        items={cal.items}
        zone={cal.timezone}
        onClose={cal.closeDay}
        hrefFor={hrefFor}
        emptyText="Nothing is scheduled on this day."
        action={
          canCreate && cal.selectedDay ? (
            <Button
              fullWidth
              variant="secondary"
              leftIcon={Plus}
              onClick={() => newGathering(cal.selectedDay as string)}
            >
              {`New gathering on ${formatDay(cal.selectedDay, { month: 'short', day: 'numeric' })}`}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
