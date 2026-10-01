/**
 * @file UnitDetail.tsx
 * @description One unit: its people, its gatherings, its giving, its sub-units.
 *
 * This is the unit-scoped version of the dashboard — what a branch leader sees
 * when their permissions stop at their own unit.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, MapPin, Network, Users } from 'lucide-react';
import { commsService } from '@/services/commsService';
import { membersService } from '@/services/membersService';
import { eventsService } from '@/services/eventsService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatDateShort, formatTime } from '@/lib/formatters';

export function UnitDetail() {
  const { id = '' } = useParams();
  const { can } = useRole();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsService.list({ upcoming: true }),
  });

  const unit = units.find((u) => u.id === id);
  const subUnits = units.filter((u) => u.parentId === id);
  const unitMembers = members.filter((m) => m.unitName === unit?.name);

  if (!can('hierarchy:read')) {
    return <Navigate to="/403" replace />;
  }

  if (isLoading || !unit) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading unit…
      </Text>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-start justify-between gap-3 mb-1">
          <Text variant="h1" className="min-w-0">
            {unit.name}
          </Text>
          <Badge variant="neutral" className="shrink-0">
            {unit.type}
          </Badge>
        </div>
        <Text variant="body" color="muted">
          {unit.parentName ? `Part of ${unit.parentName}` : 'Top-level unit'}
        </Text>
        {unit.address && (
          <Text variant="caption" color="muted" className="flex items-center gap-1 mt-1">
            <MapPin size={12} aria-hidden /> {unit.address}
          </Text>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Members" value={String(unit.memberCount)} icon={Users} />
        <StatTile label="Sub-units" value={String(subUnits.length)} icon={Network} />
      </div>

      {/* Sub-units */}
      {subUnits.length > 0 && (
        <div>
          <Text variant="h2" className="mb-3">
            Below this unit
          </Text>
          <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
            {subUnits.map((child) => (
              <Link
                key={child.id}
                to={`/staff/hierarchy/units/${child.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Text variant="body" className="truncate">
                    {child.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {child.type} · {child.memberCount} members
                  </Text>
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" aria-hidden />
              </Link>
            ))}
          </Card>
        </div>
      )}

      {/* People */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">People</Text>
          <Link to="/staff/members">
            <Button variant="link" size="sm">
              See all
            </Button>
          </Link>
        </div>

        {unitMembers.length === 0 ? (
          <Card variant="flat" padding="md">
            <Text variant="body" color="muted">
              Nobody is assigned to this unit yet.
            </Text>
          </Card>
        ) : (
          <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
            {unitMembers.slice(0, 6).map((member) => (
              <Link
                key={member.id}
                to={`/staff/members/${member.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="sm"
                  className="shrink-0"
                />
                <p className="font-member-name text-body-lg truncate flex-1 text-slate-900 dark:text-slate-100">
                  {member.firstName} {member.lastName}
                </p>
                <ChevronRight size={16} className="text-slate-300 shrink-0" aria-hidden />
              </Link>
            ))}
          </Card>
        )}
      </div>

      {/* Gatherings */}
      <div>
        <Text variant="h2" className="mb-3">
          Coming up
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.slice(0, 3).map((event) => (
            <Link
              key={event.id}
              to={`/staff/events/${event.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <CalendarDays size={18} className="text-slate-400 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <Text variant="body" className="truncate">
                  {event.title}
                </Text>
                <Text variant="caption" color="muted">
                  {formatDateShort(event.startDateTime)} · {formatTime(event.startDateTime)}
                </Text>
              </div>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
