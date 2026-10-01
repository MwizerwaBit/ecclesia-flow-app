/**
 * @file EventDetail.tsx
 * @description One gathering: what it is, who came, and what to do next.
 *
 * Attendance leads the main column, because for a past service that is the only
 * question anyone asks of this screen. The when and where move into the aside on
 * desktop — needed, but not what you came for.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, MapPin, Pencil, Repeat, Users } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { DetailLayout } from '@/components/layout';
import { Badge, Button, Card, Text } from '@/components/ui';
import { formatDate, formatPercent, formatTime } from '@/lib/formatters';

export function EventDetail() {
  const { id = '' } = useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id),
    enabled: Boolean(id),
  });

  const { data: summary } = useQuery({
    queryKey: ['event', id, 'attendance'],
    queryFn: () => eventsService.getAttendanceSummary(id),
    enabled: Boolean(id),
  });

  if (isLoading || !event) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading gathering…
      </Text>
    );
  }

  // Derived from the record rather than the clock, so the screen renders the
  // same on every pass and a completed gathering reads as past even if re-dated.
  const isPast = event.status === 'completed' || event.status === 'canceled';

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
    </>
  );

  const aside = (
    <>
      <Card variant="outline" padding="md" className="space-y-3">
        <Text variant="label" color="muted">
          Details
        </Text>

        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body">{formatDate(event.startDateTime)}</Text>
        </div>

        <div className="flex items-center gap-3">
          <Clock size={18} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body">
            {formatTime(event.startDateTime)}
            {event.endDateTime ? ` – ${formatTime(event.endDateTime)}` : ''}
          </Text>
        </div>

        {event.location && (
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-slate-400 shrink-0" aria-hidden />
            <Text variant="body">{event.location}</Text>
          </div>
        )}

        {event.isRecurring && (
          <div className="flex items-center gap-3">
            <Repeat size={18} className="text-slate-400 shrink-0" aria-hidden />
            <Text variant="body" color="muted">
              Repeats weekly
            </Text>
          </div>
        )}
      </Card>

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
        <Link to={`/staff/events/${event.id}/edit`}>
          <Button variant="ghost" fullWidth leftIcon={Pencil}>
            Edit this gathering
          </Button>
        </Link>
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
          <Badge variant={event.status === 'published' ? 'success' : 'neutral'} dot>
            {event.status}
          </Badge>
        </div>
        {event.description && (
          <Text variant="body" color="muted">
            {event.description}
          </Text>
        )}
      </header>

      <DetailLayout main={main} aside={aside} />
    </div>
  );
}
