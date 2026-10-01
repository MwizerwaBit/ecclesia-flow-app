/**
 * @file BatchReviewClose.tsx
 * @description Reconcile a batch against the money physically counted, then close it.
 *
 * The verified total is entered independently of the itemised entries — that is the
 * whole point of the control. Any discrepancy is shown plainly before the close
 * button will act, and unresolved envelopes are surfaced first because they are the
 * likeliest cause.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Ban, Check, Lock } from 'lucide-react';
import { financeService } from '@/services/financeService';
import { Badge, Button, Card, EmptyState, Input, Text } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function BatchReviewClose() {
  const { batchId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [verifiedTotal, setVerifiedTotal] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  const { data: batch } = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => financeService.getBatch(batchId),
    enabled: Boolean(batchId),
  });

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations', batchId],
    queryFn: () => financeService.listDonations(batchId),
    enabled: Boolean(batchId),
  });

  const enteredTotal = useMemo(
    () => donations.filter((d) => !d.isVoided).reduce((sum, d) => sum + d.amount, 0),
    [donations],
  );

  // An envelope with no member attached still counts toward the total, but it
  // cannot be credited to anyone until someone resolves it.
  const unresolved = donations.filter((d) => !d.memberId && !d.isVoided);

  const parsedVerified = Number.parseFloat(verifiedTotal);
  const hasVerified = Number.isFinite(parsedVerified);
  const discrepancy = hasVerified ? parsedVerified - enteredTotal : 0;
  const isBalanced = hasVerified && Math.abs(discrepancy) < 0.005;
  const alreadyClosed = batch?.status !== 'open';

  const closeBatch = useMutation({
    mutationFn: () => financeService.closeBatch({ batchId, verifiedTotal: parsedVerified }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['batches'] });
      void queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      setIsClosed(true);
    },
  });

  if (isClosed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={40} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          Batch closed — well done
        </Text>
        <Text variant="body" color="muted" className="max-w-xs mb-8">
          {formatCurrency(parsedVerified)} reconciled across {donations.length} gifts. Every giver
          will see this on their statement.
        </Text>
        <Button variant="primary" onClick={() => navigate('/staff/finance/batches')}>
          Back to batches
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Text variant="h1" className="mb-1 truncate">
              Review batch
            </Text>
            <Text variant="body-sm" color="muted">
              {batch ? `${batch.name} · ${formatDate(batch.date)}` : 'Loading…'}
            </Text>
          </div>
          {batch && (
            <Badge variant={batch.status === 'open' ? 'warning' : 'success'} dot>
              {batch.status}
            </Badge>
          )}
        </div>
      </header>

      {/* Reconciliation */}
      <Card variant="outline" padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <Text variant="label" color="muted">
            Entered total
          </Text>
          <Text variant="h3" className="tabular-nums">
            {formatCurrency(enteredTotal)}
          </Text>
        </div>

        <Input
          label="Counted total"
          inputMode="decimal"
          placeholder="0.00"
          disabled={alreadyClosed}
          value={alreadyClosed ? String(batch?.verifiedTotal ?? '') : verifiedTotal}
          onChange={(e) => setVerifiedTotal(e.target.value.replace(/[^0-9.]/g, ''))}
          className="[&_input]:h-14 [&_input]:text-body-lg [&_input]:tabular-nums"
        />

        {hasVerified && !isBalanced && (
          <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5">
            <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
            <div>
              <Text variant="body-sm" className="text-warning font-medium">
                Off by {formatCurrency(Math.abs(discrepancy))}
              </Text>
              <Text variant="caption" className="text-warning/90">
                {discrepancy > 0
                  ? 'More was counted than entered — an entry may be missing.'
                  : 'Less was counted than entered — an entry may be duplicated.'}
              </Text>
            </div>
          </div>
        )}

        {isBalanced && (
          <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2.5">
            <Check size={18} className="text-success shrink-0" aria-hidden />
            <Text variant="body-sm" className="text-success font-medium">
              Balanced to the penny
            </Text>
          </div>
        )}
      </Card>

      {/* Unresolved envelopes first — they are what usually needs a human */}
      {unresolved.length > 0 && (
        <div>
          <Text variant="label" color="muted" className="mb-2 block">
            Needs attention · {unresolved.length}
          </Text>
          <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
            {unresolved.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <Text variant="body" className="truncate">
                    {donation.envelopeNumber
                      ? `Envelope #${donation.envelopeNumber}`
                      : donation.guestName || 'Unidentified gift'}
                  </Text>
                  <Text variant="caption" color="muted">
                    No member matched · {donation.fundName}
                  </Text>
                </div>
                <Text variant="body" className="tabular-nums font-medium shrink-0">
                  {formatCurrency(donation.amount)}
                </Text>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Everything in the batch */}
      <div>
        <Text variant="label" color="muted" className="mb-2 block">
          All gifts · {donations.length}
        </Text>

        {isLoading && (
          <Text variant="body" color="muted" className="text-center py-8">
            Loading gifts…
          </Text>
        )}

        {!isLoading && donations.length === 0 ? (
          <EmptyState
            icon={Lock}
            title="Nothing recorded yet"
            description="Record at least one gift before closing this batch."
            action={
              <Button
                variant="secondary"
                onClick={() => navigate(`/staff/finance/batches/${batchId}/donations/new`)}
              >
                Record giving
              </Button>
            }
          />
        ) : (
          <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
            {donations.map((donation) => (
              <div
                key={donation.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  donation.isVoided && 'opacity-50 line-through',
                )}
              >
                <div className="min-w-0">
                  <p className="font-member-name text-body-lg truncate text-slate-900 dark:text-slate-100">
                    {donation.memberName ?? donation.guestName ?? `Envelope #${donation.envelopeNumber}`}
                  </p>
                  <Text variant="caption" color="muted">
                    {donation.fundName} · {donation.paymentMethod.replace('_', ' ')}
                  </Text>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Text variant="body" className="tabular-nums font-medium">
                    {formatCurrency(donation.amount)}
                  </Text>
                  {!donation.isVoided && !alreadyClosed && (
                    <Link to={`/staff/finance/batches/${batchId}/void?donationId=${donation.id}`}>
                      <Button variant="ghost" size="sm" aria-label={`Void ${donation.memberName ?? 'this gift'}`}>
                        <Ban size={15} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {!alreadyClosed && (
        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Lock}
            disabled={!hasVerified || donations.length === 0}
            isLoading={closeBatch.isPending}
            onClick={() => closeBatch.mutate()}
          >
            Close batch
          </Button>
          {hasVerified && !isBalanced && (
            <Text variant="caption" color="muted" className="block text-center">
              The discrepancy will be recorded against this batch.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
