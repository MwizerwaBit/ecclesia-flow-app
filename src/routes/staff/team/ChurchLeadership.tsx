/**
 * @file ChurchLeadership.tsx
 * @description Who the church leader is, and the one sanctioned way to change it.
 *
 * Leadership is a single flag, not a role — a role governs what someone can
 * do day to day, this governs who the org is accountable to. Changing it
 * needs its own process for exactly that reason: a multi-approval checklist
 * that stays visible mid-flight rather than a modal that completes silently.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Check, Crown, ShieldCheck, UserCheck, X } from 'lucide-react';
import { teamService } from '@/services/teamService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Badge, Button, Card, EmptyState, MfaStepUpPrompt, Skeleton, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/formatters';

export function ChurchLeadership() {
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [approvingAs, setApprovingAs] = useState<string | null>(null);

  const { data: leader, isLoading: isLoadingLeader } = useQuery({
    queryKey: ['team', 'leader'],
    queryFn: () => teamService.getLeader(),
  });

  const { data: request, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['team', 'leadership-transfer'],
    queryFn: () => teamService.getLeadershipTransfer(),
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.listTeam(),
  });

  const approve = useMutation({
    mutationFn: (approverId: string) => teamService.approveLeadershipTransfer(request!.id, approverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'leadership-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['team', 'leader'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setApprovingAs(null);
    },
  });

  const cancel = useMutation({
    mutationFn: () => teamService.cancelLeadershipTransfer(request!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', 'leadership-transfer'] }),
  });

  if (!can('org:settings')) {
    return <Navigate to="/403" replace />;
  }

  if (isLoadingLeader || isLoadingRequest) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const isPending = request?.status === 'pending_approvals';
  const isCompleted = request?.status === 'completed';
  const eligibleApprovers = team.filter((m) => request?.eligibleApproverIds.includes(m.id));
  const approvedIds = new Set(request?.approvals.map((a) => a.teamMemberId));

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Link to="/staff/team" className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-3 inline-block">
          &larr; Back to team
        </Link>
        <Text variant="h1" className="mb-1">
          Church leadership
        </Text>
        <Text variant="body" color="muted">
          The org&rsquo;s accountable owner, and the sanctioned way to change it.
        </Text>
      </header>

      {isCompleted && (
        <Card accent="success" padding="md" className="flex items-start gap-3">
          <Check size={18} className="text-success shrink-0 mt-0.5" aria-hidden />
          <div>
            <Text variant="body" className="font-medium">
              Leadership transferred to {request.nomineeName}
            </Text>
            <Text variant="body-sm" color="muted">
              Completed {request.completedAt ? formatDateTime(request.completedAt) : ''}
            </Text>
          </div>
        </Card>
      )}

      {leader && (
        <Card padding="lg" className="flex items-center gap-4">
          <Avatar src={leader.photoUrl} name={`${leader.firstName} ${leader.lastName}`} size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Crown size={14} className="text-amber-500 shrink-0" aria-hidden />
              <Text variant="label" color="muted">
                Current church leader
              </Text>
            </div>
            <Text variant="h3">
              {leader.firstName} {leader.lastName}
            </Text>
          </div>
        </Card>
      )}

      {!isPending && (
        <Card variant="outline" padding="md">
          <Text variant="body-sm" color="muted" className="mb-3">
            Changing who holds this requires a fresh verification code from the current leader,
            plus sign-off from {request?.requiredApprovals ?? 2} other staff members before it
            takes effect.
          </Text>
          <Link to="/staff/team/leadership/transfer">
            <Button variant="secondary" fullWidth leftIcon={Crown}>
              Transfer leadership
            </Button>
          </Link>
        </Card>
      )}

      {isPending && request && (
        <Card padding="lg" className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Text variant="h3" className="mb-1">
                Transfer in progress
              </Text>
              <Text variant="body-sm" color="muted">
                {request.outgoingLeaderName} &rarr; {request.nomineeName}
              </Text>
            </div>
            <Button variant="ghost" size="sm" leftIcon={X} onClick={() => cancel.mutate()} isLoading={cancel.isPending}>
              Cancel
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Text variant="label" color="muted">
                Approvals
              </Text>
              <Text variant="label" color="muted">
                {request.approvals.length} of {request.requiredApprovals}
              </Text>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (request.approvals.length / request.requiredApprovals) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {eligibleApprovers.map((approver) => {
              const hasApproved = approvedIds.has(approver.id);
              return (
                <div key={approver.id} className="flex items-center gap-3">
                  <Avatar src={approver.photoUrl} name={`${approver.firstName} ${approver.lastName}`} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Text variant="body-sm" className="font-medium truncate">
                      {approver.firstName} {approver.lastName}
                    </Text>
                  </div>
                  {hasApproved ? (
                    <Badge variant="success" size="sm">
                      <UserCheck size={12} className="mr-1" aria-hidden /> Approved
                    </Badge>
                  ) : approvingAs === approver.id ? null : (
                    <Button variant="secondary" size="sm" onClick={() => setApprovingAs(approver.id)}>
                      Approve as {approver.firstName}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {approvingAs && (
            <MfaStepUpPrompt
              description={`Confirms this approval is really from ${eligibleApprovers.find((a) => a.id === approvingAs)?.firstName}.`}
              confirmLabel="Approve"
              onCancel={() => setApprovingAs(null)}
              onVerified={() => approve.mutate(approvingAs)}
            />
          )}

          {eligibleApprovers.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No eligible approvers"
              description="Every other active staff member is already the outgoing leader or the nominee."
            />
          )}
        </Card>
      )}
    </div>
  );
}
