/**
 * @file AttendanceReport.tsx
 * @description Who came and who did not, for one gathering.
 *
 * The absent list is the useful half — present people need no follow-up. It is
 * therefore given equal weight rather than hidden behind a toggle, and every
 * absent name links straight to that person's record.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Download, UserX } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Avatar, Button, Card, SegmentedControl, StatTile, Text } from '@/components/ui';
import { formatDate, formatPercent } from '@/lib/formatters';

type Tab = 'absent' | 'present';

export function AttendanceReport() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [tab, setTab] = useState<Tab>('absent');

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => eventsService.list(),
  });

  const activeEvent = events.find((e) => e.id === eventId) ?? events.find((e) => e.attendeeCount);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['event', activeEvent?.id, 'attendance'],
    queryFn: () => eventsService.getAttendanceSummary(activeEvent!.id),
    enabled: Boolean(activeEvent?.id),
  });

  if (isLoading || !summary || !activeEvent) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading the register…
      </Text>
    );
  }

  const roster = tab === 'absent' ? summary.absentMembers : summary.presentMembers;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Attendance report
        </Text>
        <Text variant="body" color="muted">
          {activeEvent.title} · {formatDate(activeEvent.startDateTime)}
        </Text>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Present" value={String(summary.totalPresent)} icon={Check} />
        <StatTile label="Absent" value={String(summary.absentMembers.length)} icon={UserX} />
        <StatTile label="Rate" value={formatPercent(summary.attendanceRate, 0)} />
      </div>

      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-slow"
          style={{ width: `${Math.min(100, summary.attendanceRate * 100)}%` }}
        />
      </div>

      <SegmentedControl
        label="Roster view"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'absent', label: `Absent (${summary.absentMembers.length})` },
          { value: 'present', label: `Present (${summary.presentMembers.length})` },
        ]}
      />

      <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
        {roster.map((person) => (
          <Link
            key={person.id}
            to={`/staff/members/${person.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <Avatar name={person.name} size="sm" className="shrink-0" />
            <p className="font-member-name text-body-lg truncate flex-1 text-slate-900 dark:text-slate-100">
              {person.name}
            </p>
            {tab === 'absent' ? (
              <UserX size={16} className="text-slate-300 shrink-0" aria-label="Absent" />
            ) : (
              <Check size={16} className="text-success shrink-0" aria-label="Present" />
            )}
          </Link>
        ))}

        {roster.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Text variant="body" color="muted">
              {tab === 'absent' ? 'Everyone was here.' : 'Nobody has been marked present.'}
            </Text>
          </div>
        )}
      </Card>

      {tab === 'absent' && summary.absentMembers.length > 0 && (
        <Link to="/staff/comms/announcements/new">
          <Button variant="secondary" fullWidth>
            Message everyone who was away
          </Button>
        </Link>
      )}

      <Button variant="ghost" fullWidth leftIcon={Download}>
        Export this register
      </Button>
    </div>
  );
}
