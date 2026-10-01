/**
 * @file DataErasureQueue.tsx
 * @description PA-15 — GDPR and POPIA erasure requests, reviewed before they run.
 *
 * Erasure is irreversible and partial by design: personal fields are anonymised
 * while donation records are retained with the name replaced by a token, because
 * financial records have their own statutory retention period. That trade-off is
 * spelled out on the approval, since the person approving is accountable for it.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react';
import type { DataErasureRequest } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, BottomSheet, Button, Card, EmptyState, Text } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/formatters';

const STATUS_BADGE: Record<
  DataErasureRequest['status'],
  { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; label: string }
> = {
  pending: { variant: 'warning', label: 'Needs review' },
  approved: { variant: 'info', label: 'Approved' },
  processing: { variant: 'info', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  rejected: { variant: 'neutral', label: 'Rejected' },
};

/** What the erasure script does, shown before anyone approves one. */
const ERASURE_EFFECTS = [
  { kept: false, label: 'Name, email, phone and address are overwritten' },
  { kept: false, label: 'Photo and pastoral notes are deleted' },
  { kept: true, label: 'Donation records are kept, with the giver replaced by a token' },
  { kept: true, label: 'Attendance counts are kept, without the individual link' },
  { kept: true, label: 'An audit entry records that the erasure happened' },
];

export function DataErasureQueue() {
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<DataErasureRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['platform', 'erasure-requests'],
    queryFn: () => platformService.listErasureRequests(),
  });

  const decide = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      platformService.decideErasureRequest(reviewing!.id, decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'erasure-requests'] });
      setReviewing(null);
    },
  });

  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Erasure requests
        </Text>
        <Text variant="body" color="muted">
          {pending.length === 0
            ? 'Nothing waiting on review.'
            : `${pending.length} awaiting review.`}
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading requests…
        </Text>
      )}

      {!isLoading && requests.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No requests"
          description="Right-to-erasure requests raised by churches arrive here for review."
        />
      )}

      <div className="space-y-3">
        {requests.map((request) => {
          const badge = STATUS_BADGE[request.status];
          const isPending = request.status === 'pending';

          return (
            <Card key={request.id} padding="md" variant="elevated">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <Text variant="h3" className="truncate">
                    {request.memberDisplayName}
                  </Text>
                  <Text variant="caption" color="muted">
                    {request.orgName} · requested by {request.requestedBy}
                  </Text>
                </div>
                <Badge variant={badge.variant} size="sm" className="shrink-0">
                  {badge.label}
                </Badge>
              </div>

              <Text variant="caption" color="muted" className="block">
                Raised {formatRelative(request.requestedAt)}
                {request.completedAt ? ` · completed ${formatDate(request.completedAt)}` : ''}
                {request.processedBy ? ` · by ${request.processedBy}` : ''}
              </Text>

              {request.notes && (
                <Text variant="body-sm" color="muted" className="block mt-2">
                  {request.notes}
                </Text>
              )}

              {isPending && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onClick={() => setReviewing(request)}
                >
                  Review this request
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {reviewing && (
        <BottomSheet
          open
          onClose={() => setReviewing(null)}
          title="Review erasure request"
          description={`${reviewing.memberDisplayName} at ${reviewing.orgName}`}
          footer={
            <div className="space-y-2">
              <Button
                variant="destructive"
                size="lg"
                fullWidth
                leftIcon={Check}
                isLoading={decide.isPending}
                onClick={() => decide.mutate('approved')}
              >
                Approve and erase
              </Button>
              <Button
                variant="ghost"
                fullWidth
                leftIcon={X}
                onClick={() => decide.mutate('rejected')}
              >
                Reject
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-danger-light px-3 py-2.5">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden />
              <Text variant="caption" className="text-danger">
                This cannot be undone. Completed erasures are permanently logged and the data cannot
                be recovered from backups.
              </Text>
            </div>

            <div>
              <Text variant="label" color="muted" className="mb-2 block">
                What happens
              </Text>
              <div className="space-y-2">
                {ERASURE_EFFECTS.map((effect) => (
                  <div key={effect.label} className="flex items-start gap-2">
                    {effect.kept ? (
                      <ShieldCheck size={15} className="text-info shrink-0 mt-0.5" aria-hidden />
                    ) : (
                      <X size={15} className="text-danger shrink-0 mt-0.5" aria-hidden />
                    )}
                    <Text variant="body-sm" color="muted">
                      {effect.label}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            <Text variant="caption" color="muted">
              Donation records are retained because financial records carry their own statutory
              retention period that the right to erasure does not override.
            </Text>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
