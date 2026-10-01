/**
 * @file MemberEventDetail.tsx
 * @description What a member sees about one gathering.
 *
 * The member-facing counterpart to the staff EventDetail: no attendance figures,
 * no register, no edit. Just what it is, when, where, and the two things a member
 * actually wants to do — put it in their calendar and tell someone about it.
 */
import { useQuery } from '@tanstack/react-query';
import type { ChurchEvent } from '@/types';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Clock, MapPin, Repeat, Share2 } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Badge, Button, Card, Text } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/formatters';

/** Builds a Google Calendar link; the native share sheet handles the rest. */
function calendarUrl(title: string, startIso: string, endIso: string | undefined, location?: string) {
  const stamp = (iso: string) => `${iso.replace(/[-:]/g, '').split('.')[0]}Z`;
  const end = endIso ?? new Date(new Date(startIso).getTime() + 90 * 60_000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(startIso)}/${stamp(end)}`,
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function MemberEventDetail() {
  const { id = '' } = useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id),
    enabled: Boolean(id),
  });

  if (isLoading || !event) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading…
      </Text>
    );
  }

  // Takes the event rather than closing over it: the closure outlives the
  // narrowing that the loading guard above provides.
  async function share(shared: ChurchEvent) {
    const payload = {
      title: shared.title,
      text: `${shared.title} — ${formatDate(shared.startDateTime)} at ${formatTime(shared.startDateTime)}`,
      url: window.location.href,
    };
    // Native share sheet where it exists, clipboard everywhere else.
    if (navigator.share) {
      await navigator.share(payload).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <Link to="/portal/events">
        <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="-ml-2">
          All events
        </Button>
      </Link>

      <header>
        <Badge variant="primary" size="sm" className="capitalize mb-2">
          {event.type}
        </Badge>
        <Text variant="h1" className="mb-2">
          {event.title}
        </Text>
        {event.description && (
          <Text variant="body-lg" color="muted">
            {event.description}
          </Text>
        )}
      </header>

      <Card variant="outline" padding="md" className="space-y-3">
        <div className="flex items-start gap-3">
          <Clock size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <Text variant="body">{formatDate(event.startDateTime)}</Text>
            <Text variant="body-sm" color="muted">
              {formatTime(event.startDateTime)}
              {event.endDateTime ? ` – ${formatTime(event.endDateTime)}` : ''}
            </Text>
          </div>
        </div>

        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
            <Text variant="body">{event.location}</Text>
          </div>
        )}

        {event.isRecurring && (
          <div className="flex items-start gap-3">
            <Repeat size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
            <Text variant="body" color="muted">
              Happens every week
            </Text>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2 lg:flex-row">
        <a
          href={calendarUrl(event.title, event.startDateTime, event.endDateTime, event.location)}
          target="_blank"
          rel="noreferrer"
          className="flex-1"
        >
          <Button variant="primary" fullWidth leftIcon={CalendarPlus}>
            Add to my calendar
          </Button>
        </a>
        <Button variant="secondary" leftIcon={Share2} onClick={() => share(event)} className="lg:w-auto">
          Share
        </Button>
      </div>

      <Text variant="caption" color="muted" className="block text-center">
        Everyone is welcome — bring someone with you.
      </Text>
    </div>
  );
}
