/**
 * @file ChurchLandingPage.tsx
 * @description The church-specific page a visitor lands on after choosing one.
 *
 * Deliberately thin: everything here is either the chosen org's own public
 * record (name, country) or genuinely shared across every church (the
 * public-calendar preview, the sign-in CTA) — nothing here invents
 * per-church copy or imagery that doesn't exist in the data yet. A real
 * backend fills this in with whatever the church's own admins have set up
 * (a welcome message, photos) without the page shape changing.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { churchDirectoryService } from '@/services/churchDirectoryService';
import { eventsService } from '@/services/eventsService';
import { Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { DateChip } from '@/components/events/DateChip';
import { eventWhen, upcomingByDate } from '@/components/events/eventOccurrence';
import { usePublicChurchZone } from '@/components/events/usePublicChurchZone';
import { formatTime } from '@/lib/formatters';

export function ChurchLandingPage() {
  const { slug = '' } = useParams();

  const { data: church, isLoading } = useQuery({
    queryKey: ['public', 'church', slug],
    queryFn: () => churchDirectoryService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'public', slug],
    queryFn: () => eventsService.publicEvents(slug),
    enabled: Boolean(church),
  });

  // The church's zone (the public calendar names it), so a 9:00 service sits on its own Sunday.
  const zone = usePublicChurchZone(slug);
  // A repeating service is about its next date, not the one it started on.
  const nextDate = eventWhen;
  const upcoming = useMemo(
    () => upcomingByDate(events).slice(0, 3),
    [events],
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <EmptyState
          icon={MapPin}
          title="We couldn't find that church"
          description="It may have moved, or the link may be out of date."
          action={
            <Link to="/churches">
              <Button variant="primary">Search for a church</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <header className="text-center mb-8">
        <Link to="/churches" className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-3 inline-block">
          &larr; Not your church?
        </Link>
        <Text variant="h1" className="mb-2">
          {church.displayName}
        </Text>
        <Text variant="body-lg" color="muted" className="flex items-center justify-center gap-1.5">
          <MapPin size={16} aria-hidden /> {church.country}
        </Text>
      </header>

      <Card padding="lg" className="mb-6">
        <Text variant="h3" className="mb-2">
          Everyone is welcome
        </Text>
        <Text variant="body" color="muted">
          Here&rsquo;s what&rsquo;s coming up at {church.displayName}.
        </Text>
      </Card>

      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing listed just now"
          description="Check the full calendar, or get in touch for service times."
        />
      ) : (
        <div className="space-y-3 mb-4">
          {upcoming.map((event) => (
            <Card key={event.id} padding="none" variant="outline" className="hover:border-primary/40 transition-colors">
              <Link
                to={`/c/${slug}/events/${event.id}`}
                className="flex items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
              >
                <DateChip instant={nextDate(event)} zone={zone} className="w-16 py-3" />
                <div className="min-w-0 flex-1 p-3">
                  <Text variant="body" className="font-medium truncate">
                    {event.title}
                  </Text>
                  <Text variant="caption" color="muted">
                    {event.isAllDay ? 'All day' : formatTime(nextDate(event), 'en-US', zone)}
                  </Text>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Link to={`/c/${slug}/calendar`}>
        <Button variant="secondary" fullWidth rightIcon={ArrowRight} className="mb-3">
          View the full calendar
        </Button>
      </Link>
      <Link to={`/c/${slug}/join`}>
        <Button variant="primary" fullWidth className="mb-8">
          Join this church
        </Button>
      </Link>

      <Card variant="flat" padding="lg" className="text-center">
        <Text variant="h3" className="mb-2">
          Already part of the congregation?
        </Text>
        <Text variant="body-sm" color="muted" className="mb-4">
          Sign in to see your giving, your groups and everything else.
        </Text>
        <Link to="/login">
          <Button variant="primary">Sign in</Button>
        </Link>
      </Card>
    </div>
  );
}
