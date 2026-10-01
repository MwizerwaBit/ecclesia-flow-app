/**
 * @file PublicEventCalendar.tsx
 * @description Upcoming services, visible without signing in.
 *
 * Written for someone deciding whether to visit this Sunday, so the practical
 * details — when, where, is it for me — come before anything else.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { churchDirectoryService } from '@/services/churchDirectoryService';
import { Badge, Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { formatDateShort, formatTime } from '@/lib/formatters';

export function PublicEventCalendar() {
  const { slug = '' } = useParams();

  const { data: church, isLoading: isLoadingChurch } = useQuery({
    queryKey: ['public', 'church', slug],
    queryFn: () => churchDirectoryService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', 'public', slug],
    queryFn: () => eventsService.list({ upcoming: true }),
  });

  const publicEvents = events.filter((e) => e.isPublic && e.status === 'published');

  if (isLoadingChurch) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-24 rounded-xl" />
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
        <Link to={`/c/${slug}`} className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-3 inline-block">
          &larr; Back to {church.displayName}
        </Link>
        <Text variant="h1" className="mb-2">
          {church.displayName}
        </Text>
        <Text variant="body-lg" color="muted">
          Everyone is welcome. Here is what is coming up.
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading services…
        </Text>
      )}

      {!isLoading && publicEvents.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nothing listed just now"
          description="Get in touch and we will tell you when our next service is."
        />
      )}

      <div className="space-y-3">
        {publicEvents.map((event) => (
          <Card key={event.id} padding="md" variant="elevated">
            <div className="flex gap-4">
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
                  <Text variant="h3" className="min-w-0">
                    {event.title}
                  </Text>
                  <Badge variant="primary" size="sm" className="shrink-0 capitalize">
                    {event.type}
                  </Badge>
                </div>

                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
                  <Clock size={13} aria-hidden />
                  {formatTime(event.startDateTime)}
                </Text>

                {event.location && (
                  <Text variant="body-sm" color="muted" className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={13} aria-hidden />
                    {event.location}
                  </Text>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="flat" padding="lg" className="mt-8 text-center">
        <Text variant="h3" className="mb-2">
          Already part of the congregation?
        </Text>
        <Text variant="body-sm" color="muted" className="mb-4">
          Sign in to see your giving, your groups and everything else on the calendar.
        </Text>
        <Link to="/login">
          <Button variant="primary">Sign in</Button>
        </Link>
      </Card>
    </div>
  );
}
