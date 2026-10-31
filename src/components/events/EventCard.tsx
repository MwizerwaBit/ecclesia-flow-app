/**
 * @file EventCard.tsx
 * @description The event card of the staff screens: the gatherings list and the
 * review queue. (The member portal and the public page draw their events as
 * calendar items; see ReadOnlyCalendar.)
 *
 * The whole card is the link to the detail screen — a clear "read more," not
 * just the title text — because a card that looks clickable everywhere except
 * where it matters teaches people to stop trying. Anything else worth doing
 * without opening the event (take attendance, headcount) goes in the `actions`
 * slot below, outside the link, so it never fights the navigation for the tap.
 *
 * Day and time are the church's, never the browser's. A repeating event shows
 * its next date. The card always shows status (unless published) and who can see
 * it, and its left border is tinted by what needs attention.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, MapPin, Repeat } from 'lucide-react';
import type { EventListItem } from '@/types';
import { Badge, Card, Text } from '@/components/ui';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { dayKeyInZone } from '@/lib/calendar';
import { eventAccent } from '@/lib/events';
import { formatTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import { DateChip } from './DateChip';
import { EventStatusBadge, VisibilityBadge } from './EventBadges';
import { describeRecurrence } from './workflow/recurrence';

interface EventCardProps {
  event: EventListItem;
  href: string;
  typeLabel: string;
  /** Rendered below the link, outside it — e.g. "Take attendance", "Record headcount". */
  actions?: ReactNode;
  /** The church's IANA zone, when the screen already has it; otherwise looked up. */
  timeZone?: string;
}

export function EventCard({ event, href, typeLabel, actions, timeZone }: EventCardProps) {
  const zone = useChurchTimeZone(timeZone);
  // A repeating event is about its next date; the first one may be long past.
  const when = event.nextOccurrence ?? event.startDateTime;
  const canceled = event.status === 'canceled';

  return (
    <Card padding="none" variant="elevated" accent={eventAccent(event.status, event.type)}>
      <Link
        to={href}
        className="flex items-stretch hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
      >
        <DateChip instant={when} zone={zone} />

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <Text variant="h3" className={cn('min-w-0 truncate', canceled && 'line-through text-slate-500 dark:text-slate-400')}>
              {event.title}
            </Text>
            <ChevronRight size={18} className="text-slate-300 shrink-0 mt-0.5" aria-hidden />
          </div>

          <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
            <Clock size={13} aria-hidden />
            {event.isAllDay ? 'All day' : formatTime(when, 'en-US', zone)}
          </Text>

          {event.location && (
            <Text variant="body-sm" color="muted" className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={13} aria-hidden />
              <span className="truncate">{event.location}</span>
            </Text>
          )}

          {event.isRecurring && event.recurrenceRule && (
            <Text variant="body-sm" color="muted" className="flex items-center gap-1.5 mt-0.5">
              <Repeat size={13} aria-hidden />
              <span className="truncate">{describeRecurrence(event.recurrenceRule, zone, dayKeyInZone(event.startDateTime, zone))}</span>
            </Text>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="primary" size="sm" className="capitalize">
              {typeLabel}
            </Badge>
            <EventStatusBadge status={event.status} quietPublished />
            {event.visibility && <VisibilityBadge visibility={event.visibility} />}
            {event.attendeeCount !== undefined && (
              <Text variant="caption" color="muted" className="tabular-nums">
                {event.attendeeCount} attended
              </Text>
            )}
          </div>
        </div>
      </Link>

      {actions && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">{actions}</div>
      )}
    </Card>
  );
}
