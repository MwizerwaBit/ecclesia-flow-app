/**
 * @file DonationVoid.tsx
 * @description Void a recorded gift, with the effect on the batch shown first.
 *
 * Voiding never deletes. The record stays, flagged, because a giving history that
 * can silently lose entries is not one anyone can be asked to trust. The before
 * and after totals are shown together so the consequence is unmistakable.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Ban, Check } from 'lucide-react';
import { financeService } from '@/services/financeService';
import { Button, Card, Input, Text } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';

export function DonationVoid() {
  const { batchId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const donationId = searchParams.get('donationId');
  const navigate = useNavigate();

  const [reason, setReason] = useState('');
  const [isVoided, setVoided] = useState(false);

  const { data: donations = [] } = useQuery({
    queryKey: ['donations', batchId],
    queryFn: () => financeService.listDonations(batchId),
    enabled: Boolean(batchId),
  });

  const donation = donations.find((d) => d.id === donationId) ?? donations[0];
  const batchTotal = donations.filter((d) => !d.isVoided).reduce((sum, d) => sum + d.amount, 0);
  const totalAfter = batchTotal - (donation?.amount ?? 0);

  const voidDonation = useMutation({
    mutationFn: () => financeService.voidDonation(donation!.id, reason.trim()),
    onSuccess: () => setVoided(true),
  });

  if (!donation) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading gift…
      </Text>
    );
  }

  if (isVoided) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={40} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          Gift voided
        </Text>
        <Text variant="body" color="muted" className="max-w-xs mb-8">
          The record is kept and marked as voided. The batch total is now{' '}
          {formatCurrency(totalAfter)}.
        </Text>
        <Button variant="primary" onClick={() => navigate(`/staff/finance/batches/${batchId}/review`)}>
          Back to the batch
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Void a gift
        </Text>
        <Text variant="body" color="muted">
          Use this for a miskeyed amount or a duplicate entry.
        </Text>
      </header>

      {/* What is being voided */}
      <Card variant="outline" padding="md" className="space-y-2.5">
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Giver
          </Text>
          <Text variant="body-sm" className="font-medium">
            {donation.memberName ?? donation.guestName ?? `Envelope #${donation.envelopeNumber}`}
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Fund
          </Text>
          <Text variant="body-sm" className="font-medium">
            {donation.fundName}
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Recorded
          </Text>
          <Text variant="body-sm" className="font-medium">
            {formatDate(donation.createdAt)}
          </Text>
        </div>
        <div className="flex justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <Text variant="body" color="muted">
            Amount
          </Text>
          <Text variant="h3" className="tabular-nums">
            {formatCurrency(donation.amount)}
          </Text>
        </div>
      </Card>

      {/* Before and after */}
      <Card variant="flat" padding="md">
        <Text variant="label" color="muted" className="mb-3 block">
          Effect on the batch
        </Text>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Text variant="caption" color="muted">
              Now
            </Text>
            <Text variant="h3" className="tabular-nums">
              {formatCurrency(batchTotal)}
            </Text>
          </div>
          <span className="text-slate-300 dark:text-slate-600">&rarr;</span>
          <div className="text-right">
            <Text variant="caption" color="muted">
              After voiding
            </Text>
            <Text variant="h3" className="tabular-nums text-danger">
              {formatCurrency(totalAfter)}
            </Text>
          </div>
        </div>
      </Card>

      <Input
        label="Reason"
        autoFocus
        placeholder="Amount entered twice"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" aria-hidden />
        <Text variant="caption" className="text-warning">
          This cannot be reversed. The gift stays on the record marked as voided, and the reason is
          written to the audit log.
        </Text>
      </div>

      <Button
        variant="destructive"
        size="lg"
        fullWidth
        leftIcon={Ban}
        disabled={reason.trim().length === 0}
        isLoading={voidDonation.isPending}
        onClick={() => voidDonation.mutate()}
      >
        Void this gift
      </Button>

      <Button variant="ghost" fullWidth onClick={() => navigate(-1)}>
        Cancel
      </Button>
    </div>
  );
}
