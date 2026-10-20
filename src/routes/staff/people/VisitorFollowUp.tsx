/**
 * @file VisitorFollowUp.tsx
 * @description The queue of visitors nobody has reached yet.
 *
 * Sorted by days since the visit, oldest first — the whole point of this screen
 * is that a visitor should not go two weeks without hearing from someone. Rows
 * age visually as they wait, so the backlog is felt rather than counted.
 *
 * Assigning and resolving both persist (previously: cosmetic only — the
 * "assigned to" field was always empty and "Reached" only toggled local
 * state). Resolving still reads as "one tap and reversible," but the undo
 * now really reopens the follow-up instead of just hiding it from view.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, HeartHandshake, UserPlus, Undo2, UserCheck } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { teamService } from '@/services/teamService';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { Avatar, Badge, Button, Card, ContactActions, EmptyState, Select, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

/** Past this many days a pending visitor is treated as overdue. */
const OVERDUE_AFTER_DAYS = 7;

export function VisitorFollowUp() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['visitor-followups'],
    queryFn: () => membersService.getVisitorFollowUps(),
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.listTeam(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['visitor-followups'] });

  const assign = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) =>
      membersService.assignFollowUp(memberId, userId),
    onSuccess: refresh,
  });

  const resolve = useMutation({
    mutationFn: (memberId: string) => membersService.resolveFollowUp(memberId),
    onSuccess: refresh,
  });

  const reopen = useMutation({
    mutationFn: (memberId: string) => membersService.reopenFollowUp(memberId),
    onSuccess: refresh,
  });

  const { pending, resolved } = useMemo(
    () => ({
      pending: [...followUps].filter((f) => f.status !== 'resolved').sort((a, b) => b.daysSinceVisit - a.daysSinceVisit),
      resolved: followUps.filter((f) => f.status === 'resolved'),
    }),
    [followUps],
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Follow-ups
        </Text>
        <Text variant="body" color="muted">
          {pending.length === 0
            ? 'Everyone who visited has been reached.'
            : `${pending.length} ${pending.length === 1 ? 'visitor is' : 'visitors are'} waiting to hear from someone.`}
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading follow-ups…
        </Text>
      )}

      {!isLoading && pending.length === 0 && resolved.length === 0 && (
        <EmptyState
          icon={HeartHandshake}
          title="Nobody is waiting"
          description="New visitors added during a service appear here until someone reaches out."
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {pending.map((followUp) => {
          const isOverdue = followUp.daysSinceVisit >= OVERDUE_AFTER_DAYS;
          const member = followUp.member;
          const isMine = Boolean(user?.id) && followUp.assignedToId === user?.id;

          return (
            <Card
              key={followUp.id}
              padding="none"
              variant="elevated"
              className={cn(isOverdue && 'border border-warning/40')}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={member.photoUrl}
                    name={`${member.firstName} ${member.lastName}`}
                    size="md"
                    className="shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/staff/members/${member.id}`} className="min-w-0">
                        <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
                          {member.firstName} {member.lastName}
                        </p>
                      </Link>
                      <Badge variant={isOverdue ? 'warning' : 'info'} size="sm" className="shrink-0">
                        {followUp.daysSinceVisit}d
                      </Badge>
                    </div>

                    <Text variant="caption" color="muted">
                      Visited {formatDate(followUp.visitDate)}
                    </Text>

                    <div className="mt-1.5">
                      {followUp.assignedToId ? (
                        <Select
                          aria-label={`Reassign ${member.firstName} ${member.lastName}'s follow-up`}
                          value={followUp.assignedToId}
                          onChange={(e) => assign.mutate({ memberId: followUp.memberId, userId: e.target.value })}
                          options={team.map((t) => ({ value: t.userId, label: `${t.firstName} ${t.lastName}` }))}
                          className="[&_select]:h-8 [&_select]:text-caption max-w-48"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Text variant="caption" color="muted">
                            Not assigned yet
                          </Text>
                          {user?.id && (
                            <button
                              type="button"
                              onClick={() => assign.mutate({ memberId: followUp.memberId, userId: user.id })}
                              className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline"
                            >
                              <UserPlus size={12} aria-hidden /> Claim it
                            </button>
                          )}
                        </div>
                      )}
                      {isMine && (
                        <span className="mt-1 inline-flex items-center gap-1 text-caption text-success">
                          <UserCheck size={12} aria-hidden /> Assigned to you
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <ContactActions
                    name={`${member.firstName} ${member.lastName}`}
                    phone={member.phone}
                    email={member.email}
                    variant="secondary"
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={Check}
                    className="flex-1"
                    isLoading={resolve.isPending && resolve.variables === followUp.memberId}
                    onClick={() => resolve.mutate(followUp.memberId)}
                  >
                    Reached
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Reached — undo reopens it for real, not just a view toggle */}
      {resolved.length > 0 && (
        <div className="mt-8">
          <Text variant="label" color="muted" className="mb-2 block">
            Reached · {resolved.length}
          </Text>
          <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
            {resolved.map((followUp) => (
              <div key={followUp.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Check size={16} className="text-success shrink-0" aria-hidden />
                  <Text variant="body-sm" className="truncate">
                    {followUp.member.firstName} {followUp.member.lastName}
                  </Text>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Undo2}
                  isLoading={reopen.isPending && reopen.variables === followUp.memberId}
                  onClick={() => reopen.mutate(followUp.memberId)}
                >
                  Undo
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
