/**
 * @file EventCard.tsx
 * @description The one event-card shape, shared between the staff gatherings
 * list and the member portal's upcoming events.
 *
 * The whole card is the link to the detail screen — a clear "read more," not
 * just the title text — because a card that looks clickable everywhere except
 * where it matters teaches people to stop trying. Anything else worth doing
 * without opening the event (take attendance, add to calendar) goes in the
 * `actions` slot below, outside the link, so it never fights the navigation
 * for the tap.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import type { EventListItem } from '@/types';
import { Badge, Card, Text } from '@/components/ui';
import { formatDateShort, formatTime } from '@/lib/formatters';

interface EventCardProps {
  event: EventListItem;
  href: string;
  typeLabel: string;
  /** Rendered below the link, outside it — e.g. "Take attendance", "Add to calendar". */
  actions?: ReactNode;
}

export function EventCard({ event, href, typeLabel, actions }: EventCardProps) {
  return (
    <Card padding="none" variant="elevated">
      <Link
        to={href}
        className="flex items-stretch hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
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
            <Text variant="h3" className="min-w-0 truncate">
              {event.title}
            </Text>
            <ChevronRight size={18} className="text-slate-300 shrink-0 mt-0.5" aria-hidden />
          </div>

          <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
            <Clock size={13} aria-hidden />
            {formatTime(event.startDateTime)}
          </Text>

          {event.location && (
            <Text variant="body-sm" color="muted" className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={13} aria-hidden />
              <span className="truncate">{event.location}</span>
            </Text>
          )}

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="primary" size="sm" className="capitalize">
              {typeLabel}
            </Badge>
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
