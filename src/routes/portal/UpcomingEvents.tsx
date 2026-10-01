/**
 * @file UpcomingEvents.tsx
 * @description Member view of what is coming up.
 *
 * Every card is a real link to the gathering, and carries the one action a
 * member wants without opening it — adding it to their own calendar. The cards
 * used to be styled as clickable and do nothing, which teaches people the app
 * is broken faster than an error message would.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, Search } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { EventCard } from '@/components/events/EventCard';
import { Button, EmptyState, Input, Text } from '@/components/ui';

/** Google Calendar template link — works on every platform without a download. */
function calendarUrl(title: string, startIso: string, location?: string) {
  const stamp = (iso: string) => `${iso.replace(/[-:]/g, '').split('.')[0]}Z`;
  const end = new Date(new Date(startIso).getTime() + 90 * 60_000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(startIso)}/${stamp(end)}`,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function UpcomingEvents() {
  const [query, setQuery] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', 'portal'],
    queryFn: () => eventsService.list({ upcoming: true }),
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => e.isPublic)
      .filter((e) =>
        q
          ? e.title.toLowerCase().includes(q) || (e.location ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [events, query]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Events
        </Text>
        <Text variant="body" color="muted">
          What is coming up at your church.
        </Text>
      </header>

      <Input
        type="search"
        placeholder="Search events or locations"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={Search}
        className="mb-5"
      />

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading events…
        </Text>
      )}

      {!isLoading && visible.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={query ? 'Nothing matches that' : 'Nothing coming up'}
          description={
            query
              ? 'Try a different title or place.'
              : 'When your church publishes a service it will appear here.'
          }
        />
      )}

      <div className="space-y-3">
        {visible.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            href={`/portal/events/${event.id}`}
            typeLabel={event.type}
            actions={
              <a href={calendarUrl(event.title, event.startDateTime, event.location)} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" leftIcon={CalendarPlus}>
                  Add to calendar
                </Button>
              </a>
            }
          />
        ))}
      </div>
    </div>
  );
}
