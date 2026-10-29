/**
 * @file EventDetail.tsx
 * @description One gathering: what it is, who came, and what to do next.
 *
 * Attendance leads the main column, because for a past service that is the only
 * question anyone asks of this screen. The when and where move into the aside on
 * desktop — needed, but not what you came for. A gathering that is still a draft
 * or waiting on a review is the exception: its next step leads the page.
 *
 * Every time here is the church's, never the browser's.
 */
import { type ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
  MapPin,
  Repeat,
  SearchX,
  Users,
  Video,
} from 'lucide-react';
import type { ChurchEvent } from '@/types';
import { eventsService } from '@/services/eventsService';
import { DetailLayout } from '@/components/layout';
import { Badge, Button, Card, EmptyState, Skeleton, StatusBadge, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { VisibilityBadge } from '@/components/events/EventBadges';
import { EventHistory } from '@/components/events/workflow/EventHistory';
import { ReviewTrail } from '@/components/events/workflow/ReviewTrail';
import { WorkflowActions } from '@/components/events/workflow/WorkflowActions';
import { describeRecurrence } from '@/components/events/workflow/recurrence';
import { needsAttention, workflowState } from '@/components/events/workflow/state';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { useRole } from '@/hooks/useRole';
import { ApiError } from '@/services/adapter';
import { dayKeyInZone, describeWhen, formatDay, resolveZone } from '@/lib/calendar';
import { EVENT_TYPE_LABEL, EVENT_VISIBILITY_HELP } from '@/lib/events';
import { formatPercent } from '@/lib/formatters';

const UPCOMING_SHOWN = 5;

/** The day in words, in the church's zone: "Sunday, March 1, 2026". */
function longDay(instant: string, zone: string): string {
  return formatDay(dayKeyInZone(instant, zone), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** An occurrence's clock time, with the same length as the first one. */
function occurrenceTime(event: ChurchEvent, start: string, zone: string): string {
  if (event.isAllDay) return 'All day';
  const length = event.endDateTime ? new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime() : null;
  const end = length && length > 0 ? new Date(new Date(start).getTime() + length).toISOString() : null;
  return describeWhen({ occurrenceStart: start, occurrenceEnd: end, isAllDay: false }, zone);
}

/** Only web links become clickable; anything else is shown as text. */
function isWebLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function DetailRow({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6" role="status" aria-label="Loading gathering">
      <Skeleton className="h-8 w-2/3 mb-3" />
      <Skeleton className="h-4 w-1/2 mb-6" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export function EventDetail() {
  const { id = '' } = useParams();
  const { can } = useRole();
  const user = useCurrentUser();
  const [showAllDates, setShowAllDates] = useState(false);

  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id),
    enabled: Boolean(id),
  });

  const { data: summary } = useQuery({
    queryKey: ['event', id, 'attendance'],
    queryFn: () => eventsService.getAttendanceSummary(id),
    enabled: Boolean(id),
  });

  const zone = useChurchTimeZone();

  if (isLoading) return <DetailSkeleton />;

  if (!event) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 space-y-4" aria-live="polite">
        {missing ? (
          <EmptyState
            icon={SearchX}
            title="We can't find that gathering"
            description="It may have been removed, or it is outside the branch you look after."
            action={
              <Link to="/staff/events">
                <Button variant="secondary">Back to gatherings</Button>
              </Link>
            }
          />
        ) : (
          <>
            <ErrorNotice error={error ?? new Error('Gathering not found')} />
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Derived from the record rather than the clock, so the screen renders the
  // same on every pass and a completed gathering reads as past even if re-dated.
  const isPast = event.status === 'completed' || event.status === 'canceled';

  const eventZone = resolveZone(zone);
  const canSeeTrail = can('events:update') || can('events:review');
  const state = workflowState({ event, can, userId: user?.id ?? null });
  const leadWithWorkflow = needsAttention(event.status, state.canDecide);

  const upcoming = event.upcomingOccurrences ?? [];
  const shownDates = showAllDates ? upcoming : upcoming.slice(0, UPCOMING_SHOWN);
  const visibility = event.visibility ?? (event.isPublic ? 'public' : 'members');
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const main = (
    <>
      <Text variant="h2">Attendance</Text>

      {summary && summary.totalPresent > 0 ? (
        <Card padding="md" className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <Text variant="label" color="muted">
                Present
              </Text>
              <Text variant="number" className="tabular-nums">
                {summary.totalPresent}
                <span className="text-h3 text-slate-400"> / {summary.totalExpected}</span>
              </Text>
            </div>
            <Badge variant={summary.attendanceRate >= 0.8 ? 'success' : 'warning'}>
              {formatPercent(summary.attendanceRate, 0)}
            </Badge>
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-slow"
              style={{ width: `${Math.min(100, summary.attendanceRate * 100)}%` }}
            />
          </div>

          {summary.absentMembers.length > 0 && (
            <div>
              <Text variant="label" color="muted" className="mb-2 block">
                Not seen · {summary.absentMembers.length}
              </Text>
              <div className="flex flex-wrap gap-2">
                {summary.absentMembers.map((member) => (
                  <Link
                    key={member.id}
                    to={`/staff/members/${member.id}`}
                    className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 font-member-name text-body-sm text-slate-700 dark:text-slate-300 hover:bg-primary-light hover:text-primary transition-colors"
                  >
                    {member.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link to={`/staff/attendance/report?eventId=${event.id}`}>
            <Button variant="secondary" size="sm" fullWidth>
              Open the full register
            </Button>
          </Link>
        </Card>
      ) : (
        <Card variant="flat" padding="md" className="flex items-center gap-3">
          <Users size={20} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body" color="muted">
            No attendance recorded for this gathering yet.
          </Text>
        </Card>
      )}

      {canSeeTrail && event.reviews && <ReviewTrail reviews={event.reviews} zone={eventZone} />}
      {canSeeTrail && <EventHistory eventId={event.id} zone={eventZone} />}
    </>
  );

  const aside = (
    <>
      <Card variant="outline" padding="md" className="space-y-3">
        <Text variant="label" color="muted">
          Details
        </Text>

        <DetailRow icon={CalendarDays}>
          <Text variant="body">{longDay(event.startDateTime, eventZone)}</Text>
          {event.isRecurring && (
            <Text variant="caption" color="muted">
              First date of the series
            </Text>
          )}
        </DetailRow>

        <DetailRow icon={Clock}>
          <Text variant="body">
            {describeWhen(
              { occurrenceStart: event.startDateTime, occurrenceEnd: event.endDateTime ?? null, isAllDay: Boolean(event.isAllDay) },
              eventZone,
            )}
          </Text>
          {eventZone !== browserZone && (
            <Text variant="caption" color="muted">
              Church time ({eventZone})
            </Text>
          )}
        </DetailRow>

        {event.location && (
          <DetailRow icon={MapPin}>
            <Text variant="body">{event.location}</Text>
          </DetailRow>
        )}

        {event.onlineUrl && (
          <DetailRow icon={Video}>
            {isWebLink(event.onlineUrl) ? (
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 break-all text-body text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                Join online
                <ExternalLink size={14} aria-hidden />
              </a>
            ) : (
              <Text variant="body" className="break-all">
                {event.onlineUrl}
              </Text>
            )}
          </DetailRow>
        )}

        {event.capacity != null && (
          <DetailRow icon={Users}>
            <Text variant="body">Capacity {event.capacity}</Text>
          </DetailRow>
        )}

        {event.isRecurring && (
          <DetailRow icon={Repeat}>
            <Text variant="body">{describeRecurrence(event.recurrenceRule, eventZone, dayKeyInZone(event.startDateTime, eventZone))}</Text>
          </DetailRow>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1">
          <VisibilityBadge visibility={visibility} size="md" />
          <Text variant="body-sm" color="muted">
            {visibility === 'private' && event.groupName
              ? `Only people in ${event.groupName} can see it.`
              : EVENT_VISIBILITY_HELP[visibility]}
          </Text>
        </div>
      </Card>

      {shownDates.length > 0 && (
        <Card variant="outline" padding="md" className="space-y-2">
          <Text variant="label" color="muted">
            Coming up
          </Text>
          <ul className="space-y-1.5">
            {shownDates.map((start) => (
              <li key={start} className="flex items-baseline justify-between gap-3">
                <Text variant="body">{formatDay(dayKeyInZone(start, eventZone))}</Text>
                <Text variant="body-sm" color="muted" className="shrink-0 tabular-nums">
                  {event.isAllDay ? 'All day' : occurrenceTime(event, start, eventZone)}
                </Text>
              </li>
            ))}
          </ul>
          {upcoming.length > UPCOMING_SHOWN && (
            <Button variant="link" size="sm" onClick={() => setShowAllDates((v) => !v)} aria-expanded={showAllDates}>
              {showAllDates ? 'Show fewer dates' : `Show all ${upcoming.length} dates`}
            </Button>
          )}
        </Card>
      )}

      {!leadWithWorkflow && <WorkflowActions event={event} layout="panel" />}

      <div className="space-y-2">
        <Link to={`/staff/attendance/take?eventId=${event.id}`}>
          <Button variant="primary" fullWidth leftIcon={CheckCircle2}>
            {isPast ? 'Amend attendance' : 'Take attendance'}
          </Button>
        </Link>
        <Link to={`/staff/attendance/headcount?eventId=${event.id}`}>
          <Button variant="secondary" fullWidth>
            Record headcount
          </Button>
        </Link>
        {can('events:update') && (
          <Link to={`/staff/events/${event.id}/responses`}>
            <Button variant="secondary" fullWidth leftIcon={ClipboardList}>
              Registration responses
            </Button>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6 animate-fade-in">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <Text variant="h1" className="min-w-0">
            {event.title}
          </Text>
          <StatusBadge status={event.status} />
        </div>
        <Text variant="caption" color="muted" className="block mb-2">
          {EVENT_TYPE_LABEL[event.type]}
          {event.unitName ? ` · ${event.unitName}` : ''}
        </Text>
        {event.description && (
          <Text variant="body" color="muted" className="whitespace-pre-line">
            {event.description}
          </Text>
        )}
      </header>

      <DetailLayout
        hero={leadWithWorkflow ? <WorkflowActions event={event} layout="banner" /> : undefined}
        main={main}
        aside={aside}
        // The staff sidebar leaves the aside ~150px at lg, too narrow for its buttons.
        splitFrom="xl"
      />
    </div>
  );
}
