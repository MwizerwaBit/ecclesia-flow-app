/**
 * @file EventsList.tsx
 * @description Services and gatherings, split into upcoming and past.
 *
 * Attendance is the reason staff open this screen on a Sunday, so every upcoming
 * event carries the attendance action directly — no detour through the detail view.
 * Each card shows where a gathering stands (draft, waiting for review...) and who
 * can see it, so staff can tell a live service from one still being prepared.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Plus, Search } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { EventCard } from '@/components/events/EventCard';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { Button, EmptyState, Fab, Input, SegmentedControl, Skeleton, Text } from '@/components/ui';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { useRole } from '@/hooks/useRole';
import { EVENT_TYPE_LABEL } from '@/lib/events';

type Tab = 'upcoming' | 'past';

/** Wait for a pause in typing before asking the server again. */
function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-2" role="status" aria-label="Loading gatherings">
      {[0, 1, 2, 3].map((n) => (
        <Skeleton key={n} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export function EventsList() {
  const navigate = useNavigate();
  const { can } = useRole();
  const zone = useChurchTimeZone();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [text, setText] = useState('');
  const query = useDebounced(text.trim());

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', 'list', tab, query],
    // The search term is only sent when there is one: an absent value must stay absent.
    queryFn: () => eventsService.list({ upcoming: tab === 'upcoming', ...(query ? { search: query } : {}) }),
    // Keep the rows on screen while a search is refined, but never carry one
    // tab's rows over to the other: Past would list upcoming gatherings.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === tab ? previous : undefined),
  });

  const mayCreate = can('events:create');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Gatherings
        </Text>
        <Text variant="body" color="muted">
          Services, meetings and everything in between.
        </Text>
      </header>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Event period"
            value={tab}
            onChange={setTab}
            className="flex-1"
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
          <Link to="/staff/events/calendar" className="shrink-0">
            <Button variant="secondary" leftIcon={CalendarDays} className="h-12">
              Calendar
            </Button>
          </Link>
        </div>
        <Input
          type="search"
          placeholder="Search by title or location"
          value={text}
          onChange={(e) => setText(e.target.value)}
          leftIcon={Search}
        />
      </div>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading && <ListSkeleton />}

        {isError && (
          <div className="space-y-3 mb-4">
            <ErrorNotice error={error} />
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title={query ? 'Nothing matches that' : `No ${tab} gatherings`}
            description={
              query
                ? 'Try a different title or location.'
                : mayCreate
                  ? 'Create a service and your congregation will see it in their portal.'
                  : 'Gatherings will show up here once your church adds them.'
            }
            action={
              !query && mayCreate ? (
                <Link to="/staff/events/new">
                  <Button variant="primary" leftIcon={Plus}>
                    Create a gathering
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </div>

      {events.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              href={`/staff/events/${event.id}`}
              typeLabel={EVENT_TYPE_LABEL[event.type]}
              timeZone={zone}
              actions={
                tab === 'upcoming' && (event.status === 'published' || event.status === 'completed') ? (
                  <div className="flex gap-2">
                    <Link to={`/staff/attendance/take?eventId=${event.id}`} className="flex-1">
                      <Button variant="primary" size="sm" fullWidth leftIcon={CheckCircle2}>
                        Take attendance
                      </Button>
                    </Link>
                    <Link to={`/staff/attendance/headcount?eventId=${event.id}`}>
                      <Button variant="secondary" size="sm">
                        Headcount
                      </Button>
                    </Link>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {mayCreate && <Fab icon={Plus} label="New gathering" onClick={() => navigate('/staff/events/new')} />}
    </div>
  );
}
