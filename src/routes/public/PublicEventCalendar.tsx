/**
 * @file PublicEventCalendar.tsx
 * @description A church's calendar, visible without signing in: a month grid or an
 * agenda of what is coming up.
 *
 * Written for someone deciding whether to visit this Sunday, so the practical
 * details — when, where — come before anything else. A repeating service is on
 * every one of its dates, placed on the church's own days (the zone the API
 * names), not the visitor's. The month and view are in the URL.
 */
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { PublicCalendarOccurrence } from '@/types';
import { eventsService } from '@/services/eventsService';
import { churchDirectoryService } from '@/services/churchDirectoryService';
import { Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { useCalendarWindow, type FilterKey } from '@/components/events/calendar';
import { ReadOnlyCalendar } from '@/components/events/ReadOnlyCalendar';
import { cn } from '@/lib/cn';

// The public endpoint takes no filters, so none are read from the URL.
const NO_FILTERS: FilterKey[] = [];

export function PublicEventCalendar() {
  const { slug = '' } = useParams();

  const { data: church, isLoading: isLoadingChurch } = useQuery({
    queryKey: ['public', 'church', slug],
    queryFn: () => churchDirectoryService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const source = useCallback((from: string, to: string) => eventsService.publicCalendar(slug, from, to), [slug]);
  const cal = useCalendarWindow<PublicCalendarOccurrence>({
    scope: `public:${slug}`,
    source,
    filterKeys: NO_FILTERS,
    enabled: Boolean(slug && church),
    profileZone: false, // a visitor is signed out: never ask for the church profile
  });

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
    <div className={cn('w-full mx-auto px-4 py-12 animate-fade-in', cal.view === 'month' ? 'max-w-2xl xl:max-w-5xl' : 'max-w-2xl')}>
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

      <ReadOnlyCalendar
        cal={cal}
        hrefFor={(item) => `/c/${slug}/events/${item.eventId}`}
        agendaEmpty={{
          title: 'Nothing listed just now',
          description: 'Get in touch and we will tell you when our next service is.',
        }}
        monthEmpty="Nothing is listed this month."
        agendaStickyOffset="top-14" // sits under the site header
      />

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
