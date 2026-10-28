/**
 * @file PaymentApprovals.tsx
 * @description The queue of mobile-money payments waiting for a platform admin.
 *
 * For each: which church, which plan and months, what it should have paid, what
 * it says it sent, and the screenshot. Approving grants the months paid; it is
 * the one step that unlocks a church, so it asks for a fresh two-step code, and
 * it will not approve a short payment unless the admin says so on purpose.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Check, ExternalLink, X } from 'lucide-react';
import { paymentsService } from '@/services/paymentsService';
import { describeMonths, formatPlanPrice } from '@/services/billingService';
import type { ManualPaymentAdmin, ManualPaymentStatus } from '@/types';
import { Badge, Button, Card, Checkbox, EmptyState, Input, MfaStepUpPrompt, SegmentedControl, Skeleton, Text } from '@/components/ui';
import { ApiError } from '@/services/adapter';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatDateTime } from '@/lib/formatters';

function Proof({ payment }: { payment: ManualPaymentAdmin }) {
  const { data: blob, isError, error } = useQuery({
    queryKey: ['platform', 'payments', payment.id, 'proof'],
    queryFn: () => paymentsService.proof(payment.id),
    staleTime: Infinity,
  });
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (isError) return <Text variant="body-sm" className="text-danger">{errorMessage(error)}</Text>;
  if (!url) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (payment.proofMimeType === 'application/pdf') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary underline">
        <ExternalLink size={16} aria-hidden /> Open the PDF proof
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={url} alt={`Payment proof from ${payment.churchName}`} className="max-h-96 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
    </a>
  );
}

type Pending = { kind: 'approve' } | { kind: 'reject'; reason: string };

function PaymentCard({ payment }: { payment: ManualPaymentAdmin }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [awaiting, setAwaiting] = useState<Pending | null>(null);
  const isPending = payment.status === 'pending';
  const short = payment.sentAmountCents < payment.amountCents;

  const decide = useMutation({
    mutationFn: (what: Pending) =>
      what.kind === 'approve'
        ? paymentsService.approve(payment.id, { acceptAmountDifference: confirmAmount })
        : paymentsService.reject(payment.id, what.reason),
    meta: { inline: true },
    onSuccess: () => {
      setAwaiting(null);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'payments'] });
    },
    onError: () => setAwaiting(null),
  });

  const money = (cents: number) => formatPlanPrice(cents, payment.currency);

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Text variant="h3" className="truncate">{payment.churchName}</Text>
          <Text variant="body-sm" color="muted">
            {payment.tier} plan, {describeMonths(payment.months)} · sent by {payment.senderName}
          </Text>
        </div>
        <Badge variant={payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}>
          {payment.status}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-sm sm:grid-cols-4">
        <div><dt className="text-slate-500">Should pay</dt><dd className="font-semibold">{money(payment.amountCents)}</dd></div>
        <div>
          <dt className="text-slate-500">Says sent</dt>
          <dd className={payment.amountMatches ? 'font-semibold' : 'font-semibold text-warning'}>{money(payment.sentAmountCents)}</dd>
        </div>
        <div><dt className="text-slate-500">Reference</dt><dd className="font-mono">{payment.referenceCode}</dd></div>
        <div><dt className="text-slate-500">MoMo ID</dt><dd className="font-mono">{payment.momoTransactionId ?? '—'}</dd></div>
      </dl>
      <Text variant="caption" color="muted">Submitted {formatDateTime(payment.submittedAt)}</Text>

      {!payment.amountMatches && isPending && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-light p-3 text-body-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          The amount the church says it sent is {short ? 'less than' : 'different from'} the price. Check the money actually received.
        </div>
      )}

      {payment.status !== 'pending' && (
        <Text variant="body-sm" color="muted">
          {payment.status === 'approved'
            ? `Approved ${payment.decidedAt ? formatDate(payment.decidedAt) : ''}; access until ${payment.grantedUntil ? formatDate(payment.grantedUntil) : '—'}.`
            : `Rejected: ${payment.decisionNote ?? 'no reason given'}`}
        </Text>
      )}

      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide proof' : isPending ? 'Review' : 'View proof'}
      </Button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Proof payment={payment} />

          {isPending && !awaiting && (
            <div className="space-y-3">
              <Text variant="body-sm" color="muted">
                Approving gives {payment.churchName} access until{' '}
                <strong>{payment.wouldGrantUntil ? formatDate(payment.wouldGrantUntil) : '—'}</strong>
                {payment.currentPeriodEnd ? ` (added to the time they have left, until ${formatDate(payment.currentPeriodEnd)})` : ''}.
              </Text>

              {short && (
                <Checkbox
                  label="I checked: the money received covers this, approve anyway"
                  checked={confirmAmount}
                  onChange={(e) => setConfirmAmount(e.target.checked)}
                />
              )}

              {decide.error && (
                <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-3 text-body-sm font-medium text-danger">
                  {decide.error instanceof ApiError && decide.error.code === 'amount_differs'
                    ? 'Tick the box above to approve a short payment.'
                    : errorMessage(decide.error)}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" leftIcon={Check} disabled={short && !confirmAmount} onClick={() => setAwaiting({ kind: 'approve' })}>
                  Approve
                </Button>
              </div>

              <div className="space-y-2">
                <Input
                  label="Or reject, and say why (the church sees this)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  variant="secondary"
                  leftIcon={X}
                  disabled={reason.trim().length < 3}
                  onClick={() => setAwaiting({ kind: 'reject', reason: reason.trim() })}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {awaiting && (
            <MfaStepUpPrompt
              description={
                awaiting.kind === 'approve'
                  ? `Enter your two-step code to approve this payment and unlock ${payment.churchName}.`
                  : 'Enter your two-step code to reject this payment.'
              }
              confirmLabel={awaiting.kind === 'approve' ? 'Approve payment' : 'Reject payment'}
              onCancel={() => setAwaiting(null)}
              onVerified={() => decide.mutate(awaiting)}
            />
          )}
        </div>
      )}
    </Card>
  );
}

export function PaymentApprovals() {
  const [status, setStatus] = useState<ManualPaymentStatus>('pending');
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platform', 'payments', status],
    queryFn: () => paymentsService.list(status),
    refetchInterval: status === 'pending' ? 60_000 : false,
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 animate-fade-in">
      <header>
        <Text variant="h1" className="mb-1">Payments</Text>
        <Text variant="body" color="muted">
          Mobile-money payments churches say they made. Check the screenshot against your MoMo records, then approve.
        </Text>
      </header>

      <SegmentedControl
        label="Show"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'pending', label: 'Waiting' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {isError && (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-4 text-body-sm text-danger">
          {errorMessage(error)}{' '}
          <button type="button" className="font-bold underline" onClick={() => refetch()}>Try again</button>
        </div>
      )}
      {!isLoading && !isError && data.length === 0 && (
        <EmptyState icon={Banknote} title={status === 'pending' ? 'Nothing waiting' : `No ${status} payments`} description={status === 'pending' ? 'New payments appear here.' : undefined} />
      )}
      <div className="space-y-4">
        {data.map((p) => <PaymentCard key={p.id} payment={p} />)}
      </div>
    </div>
  );
}
