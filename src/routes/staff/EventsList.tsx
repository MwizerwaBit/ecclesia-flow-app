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
import { CalendarDays, CheckCircle2, MapPin, Plus, Search } from 'lucide-react';
import type { EventType } from '@/types';
import { eventsService } from '@/services/eventsService';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Fab,
  Input,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { formatDateShort, formatTime } from '@/lib/formatters';

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
              <Button variant="primary" leftIcon={Plus}>
                Create a gathering
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id} padding="none" variant="elevated">
            <div className="p-4">
              <div className="flex gap-4">
                {/* Date block — scannable at a glance down the list */}
                <div className="shrink-0 w-14 rounded-xl bg-primary-light dark:bg-primary/15 py-2 text-center">
                  <p className="text-caption font-bold uppercase tracking-wider text-primary">
                    {formatDateShort(event.startDateTime).split(' ')[0]}
                  </p>
                  <p className="font-display text-h2 leading-none text-primary">
                    {new Date(event.startDateTime).getDate()}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link to={`/staff/events/${event.id}`} className="min-w-0">
                      <Text variant="h3" className="truncate hover:text-primary transition-colors">
                        {event.title}
                      </Text>
                    </Link>
                    <Badge variant={event.status === 'published' ? 'primary' : 'neutral'} size="sm">
                      {TYPE_LABEL[event.type]}
                    </Badge>
                  </div>

                  <Text variant="caption" color="muted" className="flex items-center gap-1">
                    {formatTime(event.startDateTime)}
                    {event.location && (
                      <>
                        <MapPin size={12} className="ml-1" aria-hidden />
                        <span className="truncate">{event.location}</span>
                      </>
                    )}
                  </Text>

                  {event.attendeeCount !== undefined && (
                    <Text variant="caption" color="muted" className="mt-1 block tabular-nums">
                      {event.attendeeCount} attended
                    </Text>
                  )}
                </div>
              </div>

              {tab === 'upcoming' && (
                <div className="flex gap-2 mt-4">
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
              )}
            </div>
          </Card>
        ))}
      </div>

      <Fab icon={Plus} label="New gathering" />
    </div>
  );
}
