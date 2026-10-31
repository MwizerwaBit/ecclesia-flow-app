/**
 * @file MemberEventDetail.tsx
 * @description What a member sees about one gathering.
 *
 * The member-facing counterpart to the staff EventDetail: no attendance figures,
 * no register, no edit. Just what it is, when, where, how often, and the two
 * things a member actually wants to do — put it in their calendar and tell
 * someone about it.
 *
 * Every time is the church's, never the browser's. A repeating gathering leads
 * with its next date, says its rule in words, and lists the dates after it.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Clock, Link2, MapPin, Repeat, Share2 } from 'lucide-react';
import type { ChurchEvent } from '@/types';
import { eventsService } from '@/services/eventsService';
import { Badge, Button, Card, Skeleton, Text } from '@/components/ui';
import { CalendarError } from '@/components/events/calendar';
import { describeRecurrence } from '@/components/events/workflow/recurrence';
import { nextOccurrence } from '@/components/events/eventOccurrence';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { googleCalendarUrl } from '@/lib/calendarLinks';
import { shareOrCopy } from '@/lib/download';
import { toast } from '@/hooks/useToastStore';
import { dayKeyInZone, describeWhen, formatClock, formatDay, occurrenceDays } from '@/lib/calendar';
import { EVENT_TYPE_LABEL } from '@/lib/events';

const LONG_DAY: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
const SHORT_DAY: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
/** How many later dates show before "Show all". */
const DATES_SHOWN = 5;

/** A link made to look like the primary button: a real anchor, not a button inside one. */
const LINK_BUTTON =
  'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-sans text-body font-bold text-white shadow-primary-glow transition-all hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2';

function safeUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export function MemberEventDetail() {
  const { id = '' } = useParams();
  const zone = useChurchTimeZone();
  const [showAllDates, setShowAllDates] = useState(false);

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id),
    enabled: Boolean(id),
  });

  if (error && !event) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <CalendarError error={error} onRetry={() => void refetch()} />
        <BackLink />
      </div>
    );
  }

  if (isLoading || !event) {
    return (
      <div role="status" aria-label="Loading event" className="w-full max-w-2xl mx-auto px-4 py-6 space-y-5">
        <span className="sr-only">Loading event</span>
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
    );
  }

  // Null for a repeating gathering with no date left: say so rather than show its first date.
  const next = nextOccurrence(event, zone);
  const days = next ? occurrenceDays(next, zone) : [];
  const multiDay = days.length > 1;
  const dayLine = next
    ? multiDay
      ? `${formatDay(days[0], LONG_DAY)} to ${formatDay(days[days.length - 1], LONG_DAY)}`
      : formatDay(days[0], LONG_DAY)
    : 'No upcoming dates';
  const timeLine = !next
    ? null
    : next.isAllDay
      ? 'All day'
      : multiDay && next.occurrenceEnd
        ? `Starts ${formatClock(next.occurrenceStart, zone)}, ends ${formatClock(next.occurrenceEnd, zone)}`
        : describeWhen(next, zone);

  const repeats = event.isRecurring || Boolean(event.recurrenceRule);
  const repeatText = event.recurrenceRule ? describeRecurrence(event.recurrenceRule, zone, dayKeyInZone(event.startDateTime, zone)) : 'Repeats';
  // What comes after the date shown above.
  const nextStart = next ? new Date(next.occurrenceStart).getTime() : Infinity;
  const later = (event.upcomingOccurrences ?? []).filter((start) => new Date(start).getTime() > nextStart);
  const laterShown = showAllDates ? later : later.slice(0, DATES_SHOWN);
  const onlineUrl = safeUrl(event.onlineUrl);
  const canceled = event.status === 'canceled';

  const addToCalendar = googleCalendarUrl({
    title: event.title,
    start: event.startDateTime,
    end: event.endDateTime,
    isAllDay: event.isAllDay,
    location: event.location,
    details: [event.description, onlineUrl && `Join online: ${onlineUrl}`].filter(Boolean).join('\n\n'),
    recurrenceRule: event.recurrenceRule,
    timeZone: zone,
  });

  // Takes the event rather than closing over it: the closure outlives the
  // narrowing that the loading guard above provides.
  async function share(shared: ChurchEvent) {
    const when = next
      ? `${formatDay(dayKeyInZone(next.occurrenceStart, zone), SHORT_DAY)}${next.isAllDay ? '' : ` at ${formatClock(next.occurrenceStart, zone)}`}`
      : null;
    const payload = { title: shared.title, text: when ? `${shared.title} — ${when}` : shared.title, url: window.location.href };
    // Native share sheet where it exists, clipboard everywhere else; tell the person which happened.
    const result = await shareOrCopy(payload);
    if (result === 'copied') toast.success('Link copied');
    else if (result === 'failed') toast.error("Couldn't copy the link");
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <BackLink />

      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="primary" size="sm">
            {EVENT_TYPE_LABEL[event.type]}
          </Badge>
          {canceled && (
            <Badge variant="danger" size="sm">
              Canceled
            </Badge>
          )}
        </div>
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
            {repeats && !canceled && next && (
              <Text variant="caption" color="muted" className="block">
                Next date
              </Text>
            )}
            <Text variant="body">{dayLine}</Text>
            {timeLine && (
              <Text variant="body-sm" color="muted">
                {timeLine}
              </Text>
            )}
          </div>
        </div>

        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
            <Text variant="body">{event.location}</Text>
          </div>
        )}

        {onlineUrl && (
          <div className="flex items-start gap-3">
            <Link2 size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
            <a
              href={onlineUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 break-words text-body text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Join online
            </a>
          </div>
        )}

        {repeats && (
          <div className="flex items-start gap-3">
            <Repeat size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
            <Text variant="body" color="muted">
              {repeatText}
            </Text>
          </div>
        )}
      </Card>

      {later.length > 0 && (
        <section aria-labelledby="later-dates">
          <Text as="h2" variant="h3" id="later-dates" className="mb-2">
            Coming up after that
          </Text>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {laterShown.map((start) => (
              <li key={start} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3">
                <Text variant="body">{formatDay(dayKeyInZone(start, zone), LONG_DAY)}</Text>
                <Text variant="body-sm" color="muted">
                  {event.isAllDay ? 'All day' : formatClock(start, zone)}
                </Text>
              </li>
            ))}
          </ul>
          {later.length > DATES_SHOWN && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              aria-expanded={showAllDates}
              onClick={() => setShowAllDates((open) => !open)}
            >
              {showAllDates ? 'Show fewer dates' : `Show all ${later.length} dates`}
            </Button>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2 lg:flex-row">
        {!canceled && next && (
          <a href={addToCalendar} target="_blank" rel="noreferrer" className={LINK_BUTTON}>
            <CalendarPlus size={16} aria-hidden />
            Add to my calendar
            <span className="sr-only"> (opens Google Calendar in a new tab)</span>
          </a>
        )}
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

function BackLink() {
  return (
    <Link
      to="/portal/events"
      className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-body-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <ArrowLeft size={16} aria-hidden />
      All events
    </Link>
  );
}
