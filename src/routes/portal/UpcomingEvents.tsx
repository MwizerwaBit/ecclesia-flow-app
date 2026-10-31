/**
 * @file UpcomingEvents.tsx
 * @description The member's calendar: what is coming up at their church, as a
 * month grid or an agenda.
 *
 * The server decides what a member may see (published gatherings that are public,
 * for members, or for a group they belong to), so nothing is filtered here. Every
 * event is a real link to its page, where "Add to my calendar" lives. The month,
 * view and type filter are in the URL, so a view can be shared and Back steps
 * through months. Built from the shared calendar components.
 */
import type { CalendarOccurrence } from '@/types';
import { eventsService } from '@/services/eventsService';
import { EVENT_TYPE_LABEL } from '@/lib/events';
import { Text } from '@/components/ui';
import { CalendarFilterBar, useCalendarWindow, type FilterKey } from '@/components/events/calendar';
import { ReadOnlyCalendar } from '@/components/events/ReadOnlyCalendar';
import { cn } from '@/lib/cn';

// Module constants: the hook needs a stable filterKeys array.
const FILTER_KEYS: FilterKey[] = ['type'];
const TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }));

const sourceFor = (from: string, to: string, filters: Parameters<typeof eventsService.calendar>[2]) =>
  eventsService.calendar(from, to, filters);
const hrefFor = (item: CalendarOccurrence) => `/portal/events/${item.eventId}`;

export function UpcomingEvents() {
  const cal = useCalendarWindow<CalendarOccurrence>({ scope: 'member', source: sourceFor, filterKeys: FILTER_KEYS });

  return (
    // The agenda reads best narrow; the month grid earns the width from xl.
    <div className={cn('w-full mx-auto px-4 py-6 animate-fade-in', cal.view === 'month' ? 'max-w-2xl xl:max-w-5xl' : 'max-w-2xl')}>
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Events
        </Text>
        <Text variant="body" color="muted">
          What is coming up at your church.
        </Text>
      </header>

      <ReadOnlyCalendar
        cal={cal}
        hrefFor={hrefFor}
        filters={
          <CalendarFilterBar
            value={cal.filters}
            onChange={cal.setFilter}
            onClear={cal.clearFilters}
            typeOptions={TYPE_OPTIONS}
          />
        }
        agendaEmpty={
          cal.hasFilters
            ? { title: 'Nothing matches that', description: 'Try a different type of event.' }
            : { title: 'Nothing coming up', description: 'When your church publishes a service it will appear here.' }
        }
        monthEmpty={cal.hasFilters ? 'No events match this filter.' : 'No events this month.'}
      />
    </div>
  );
}
