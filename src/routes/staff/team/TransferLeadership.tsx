/**
 * @file TransferLeadership.tsx
 * @description Nominate a successor, then prove it's really the leader asking.
 *
 * Two steps on purpose: picking who is never itself the sensitive action, so
 * it shouldn't share a screen with the re-auth prompt — the nominee is locked
 * in before the code is even asked for.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { teamService } from '@/services/teamService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Button, Card, MfaStepUpPrompt, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

export function TransferLeadership() {
  const { can } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nomineeId, setNomineeId] = useState('');
  const [step, setStep] = useState<'nominate' | 'verify'>('nominate');

  const { data: leader } = useQuery({
    queryKey: ['team', 'leader'],
    queryFn: () => teamService.getLeader(),
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.listTeam(),
  });

  const { data: existingRequest } = useQuery({
    queryKey: ['team', 'leadership-transfer'],
    queryFn: () => teamService.getLeadershipTransfer(),
  });

  const initiate = useMutation({
    mutationFn: () => teamService.requestLeadershipTransfer(nomineeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'leadership-transfer'] });
      navigate('/staff/team/leadership');
    },
  });

  if (!can('org:settings')) {
    return <Navigate to="/403" replace />;
  }

  if (existingRequest?.status === 'pending_approvals') {
    return <Navigate to="/staff/team/leadership" replace />;
  }

  const candidates = team.filter((m) => m.acceptedAt && m.id !== leader?.id);
  const nominee = candidates.find((m) => m.id === nomineeId);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Transfer leadership
        </Text>
        <Text variant="body" color="muted">
          {step === 'nominate'
            ? 'Choose who the church leader role moves to.'
            : `Confirms this request for ${nominee?.firstName} is really coming from you.`}
        </Text>
      </header>

      {step === 'nominate' && (
        <>
          <div className="space-y-2.5">
            {candidates.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setNomineeId(member.id)}
                className="w-full text-left"
              >
                <Card
                  variant={nomineeId === member.id ? 'elevated' : 'outline'}
                  padding="md"
                  className={cn(
                    'flex items-center gap-3 transition-colors',
                    nomineeId === member.id && 'ring-2 ring-primary',
                  )}
                >
                  <Avatar src={member.photoUrl} name={`${member.firstName} ${member.lastName}`} size="md" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Text variant="body" className="font-medium truncate">
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text variant="caption" color="muted">
                      {member.roleName}
                    </Text>
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {nominee && (
            <Card variant="outline" padding="md">
              <Text variant="body-sm" color="muted">
                Once confirmed, this requires sign-off from 2 other staff members before{' '}
                <strong>{nominee.firstName} {nominee.lastName}</strong> becomes church leader —
                it doesn&rsquo;t take effect immediately.
              </Text>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Crown}
            disabled={!nomineeId}
            onClick={() => setStep('verify')}
          >
            Continue
          </Button>
        </>
      )}

      {step === 'verify' && (
        <MfaStepUpPrompt
          description="Enter the code from your authenticator app to start this transfer."
          confirmLabel="Start transfer"
          onCancel={() => setStep('nominate')}
          onVerified={() => initiate.mutate()}
        />
      )}
    </div>
  );
}
