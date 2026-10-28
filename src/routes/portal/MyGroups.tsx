/**
 * @file MyGroups.tsx
 * @description The groups a member belongs to, plus any invitation waiting
 * on them. Mirrors staff/groups/GroupsList.tsx's card layout, but this list
 * is personal — accepting or declining an invitation lives here, not in a
 * separate inbox, since a group invite is the one thing this screen exists
 * to resolve quickly.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Mail, UsersRound, X } from 'lucide-react';
import { portalService } from '@/services/portalService';
import { Badge, Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { FREQUENCY_LABELS, GROUP_TYPE_LABELS, WEEKDAY_LABELS } from '@/lib/people';
import type { GroupType, MeetingFrequency, Weekday } from '@/types';

function scheduleLine(group: {
  meetingFrequency: string;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
}): string {
  const parts = [FREQUENCY_LABELS[group.meetingFrequency as MeetingFrequency] ?? group.meetingFrequency];
  const when = [
    group.meetingDay ? (WEEKDAY_LABELS[group.meetingDay as Weekday] ?? group.meetingDay) : null,
    group.meetingTime,
  ]
    .filter(Boolean)
    .join(' ');
  if (when) parts.push(when);
  if (group.meetingLocation) parts.push(group.meetingLocation);
  return parts.join(' · ');
}

export function MyGroups() {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['me', 'groups'],
    queryFn: () => portalService.myGroups(),
  });

  const respond = useMutation({
    mutationFn: ({ membershipId, accept }: { membershipId: string; accept: boolean }) =>
      portalService.respond(membershipId, accept),
    onSuccess: (updated) => queryClient.setQueryData(['me', 'groups'], updated),
  });

  const { invited, active } = useMemo(
    () => ({
      invited: groups.filter((g) => g.status === 'invited'),
      active: groups.filter((g) => g.status === 'active'),
    }),
    [groups],
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          My groups
        </Text>
        <Text variant="body" color="muted">
          The ministries and groups you're part of.
        </Text>
      </header>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && invited.length > 0 && (
        <section className="mb-6 space-y-3">
          <Text variant="label" color="muted">
            Waiting for you
          </Text>
          {invited.map((group) => (
            <Card key={group.membershipId} padding="md" className="border-l-4 border-l-primary space-y-3">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                >
                  <Mail size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <Text variant="body" className="font-bold">
                    {group.name}
                  </Text>
                  <Text variant="caption" color="muted" className="block">
                    Invited to join as {group.roleName}
                  </Text>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  leftIcon={Check}
                  isLoading={respond.isPending && respond.variables?.membershipId === group.membershipId && respond.variables.accept}
                  onClick={() => respond.mutate({ membershipId: group.membershipId, accept: true })}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={X}
                  isLoading={respond.isPending && respond.variables?.membershipId === group.membershipId && !respond.variables.accept}
                  onClick={() => respond.mutate({ membershipId: group.membershipId, accept: false })}
                >
                  Decline
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {!isLoading && active.length === 0 && invited.length === 0 && (
        <EmptyState
          icon={UsersRound}
          title="Not in any groups yet"
          description="When a group leader adds you, or you accept an invitation, it will show up here."
        />
      )}

      {!isLoading && active.length > 0 && (
        <div className="space-y-3">
          {active.map((group) => (
            <Link key={group.membershipId} to={`/portal/groups/${group.groupId}`}>
              <Card padding="md" className="flex items-center gap-3 hover:border-primary/40 transition-colors">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                >
                  <UsersRound size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Text variant="body" className="font-bold truncate">
                      {group.name}
                    </Text>
                    {group.rank === 0 && (
                      <Badge variant="primary" size="sm">
                        {group.roleName}
                      </Badge>
                    )}
                  </div>
                  <Text variant="caption" color="muted" className="block truncate">
                    {GROUP_TYPE_LABELS[group.type as GroupType] ?? group.type} · {scheduleLine(group)}
                  </Text>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
