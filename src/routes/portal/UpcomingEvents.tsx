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
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronRight, Clock, MapPin, Search } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Badge, Button, Card, EmptyState, Input, Text } from '@/components/ui';
import { formatDateShort, formatTime } from '@/lib/formatters';

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
          <Card key={event.id} padding="none" variant="elevated">
            <Link
              to={`/portal/events/${event.id}`}
              className="flex items-stretch hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Date block */}
              <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 bg-primary-light/50 dark:bg-primary/10 py-4">
                <span className="text-caption font-bold uppercase tracking-wider text-primary">
                  {formatDateShort(event.startDateTime).split(' ')[0]}
                </span>
                <span className="font-display text-h1 leading-none text-primary">
                  {new Date(event.startDateTime).getDate()}
                </span>
              </div>

              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <Text variant="h3" className="min-w-0">
                    {event.title}
                  </Text>
                  <ChevronRight size={18} className="text-slate-300 shrink-0 mt-0.5" aria-hidden />
                </div>

                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
                  <Clock size={13} aria-hidden />
                  {formatTime(event.startDateTime)}
                </Text>

                {event.location && (
                  <Text
                    variant="body-sm"
                    color="muted"
                    className="flex items-center gap-1.5 mt-0.5"
                  >
                    <MapPin size={13} aria-hidden />
                    <span className="truncate">{event.location}</span>
                  </Text>
                )}

                <Badge variant="primary" size="sm" className="mt-2 capitalize">
                  {event.type}
                </Badge>
              </div>
            </Link>

            {/* The one action worth taking without opening the event */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
              <a
                href={calendarUrl(event.title, event.startDateTime, event.location)}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="ghost" size="sm" leftIcon={CalendarPlus}>
                  Add to calendar
                </Button>
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
