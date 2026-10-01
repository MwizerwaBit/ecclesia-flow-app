/**
 * @file VisitorFollowUp.tsx
 * @description The queue of visitors nobody has reached yet.
 *
 * Sorted by days since the visit, oldest first — the whole point of this screen
 * is that a visitor should not go two weeks without hearing from someone. Rows
 * age visually as they wait, so the backlog is felt rather than counted.
 *
 * Resolving is one tap and reversible for a few seconds, because the common
 * mistake is resolving the wrong row while scrolling one-handed.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, HeartHandshake, Mail, Phone, Undo2, UserCheck } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { Avatar, Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

/** Past this many days a pending visitor is treated as overdue. */
const OVERDUE_AFTER_DAYS = 7;

export function VisitorFollowUp() {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['visitor-followups'],
    queryFn: () => membersService.getVisitorFollowUps(),
  });

  const pending = useMemo(
    () =>
      [...followUps]
        .filter((f) => !resolvedIds.has(f.id))
        .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit),
    [followUps, resolvedIds],
  );

  const resolved = followUps.filter((f) => resolvedIds.has(f.id));

  function resolve(id: string) {
    setResolvedIds((prev) => new Set(prev).add(id));
  }

  function undo(id: string) {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

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

                    <Text variant="caption" color="muted" className="block mt-0.5">
                      {followUp.assignedToName ? (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck size={12} aria-hidden /> {followUp.assignedToName}
                        </span>
                      ) : (
                        'Not assigned to anyone yet'
                      )}
                    </Text>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" leftIcon={Phone} className="flex-1">
                    Call
                  </Button>
                  <Button variant="secondary" size="sm" leftIcon={Mail} className="flex-1">
                    Email
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={Check}
                    className="flex-1"
                    onClick={() => resolve(followUp.id)}
                  >
                    Reached
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Resolved this session — kept visible so a mis-tap is recoverable */}
      {resolved.length > 0 && (
        <div className="mt-8">
          <Text variant="label" color="muted" className="mb-2 block">
            Reached just now · {resolved.length}
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
                  onClick={() => undo(followUp.id)}
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
