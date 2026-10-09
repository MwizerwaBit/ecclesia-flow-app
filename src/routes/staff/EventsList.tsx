/**
 * @file EventsList.tsx
 * @description Services and gatherings, split into upcoming and past.
 *
 * Attendance is the reason staff open this screen on a Sunday, so every upcoming
 * event carries the attendance action directly — no detour through the detail view.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Plus, Search } from 'lucide-react';
import type { EventType } from '@/types';
import { eventsService } from '@/services/eventsService';
import { EventCard } from '@/components/events/EventCard';
import {
  Button,
  EmptyState,
  Fab,
  Input,
  SegmentedControl,
  Text,
} from '@/components/ui';

type Tab = 'upcoming' | 'past';

const TYPE_LABEL: Record<EventType, string> = {
  service: 'Service',
  meeting: 'Meeting',
  event: 'Event',
  prayer: 'Prayer',
  outreach: 'Outreach',
  other: 'Other',
};

export function EventsList() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [query, setQuery] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', tab, query],
    queryFn: () => eventsService.list({ upcoming: tab === 'upcoming', search: query || undefined }),
  });

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
        <SegmentedControl
          label="Event period"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
        <Input
          type="search"
          placeholder="Search by title or location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={Search}
        />
      </div>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading gatherings…
        </Text>
      )}

      {!isLoading && events.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={query ? 'Nothing matches that' : `No ${tab} gatherings`}
          description={
            query
              ? 'Try a different title or location.'
              : 'Create a service and your congregation will see it in their portal.'
          }
          action={
            !query ? (
              <Link to="/staff/events/new">
                <Button variant="primary" leftIcon={Plus}>
                  Create a gathering
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            href={`/staff/events/${event.id}`}
            typeLabel={TYPE_LABEL[event.type]}
            actions={
              tab === 'upcoming' ? (
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

      <Fab icon={Plus} label="New gathering" />
    </div>
  );
}
