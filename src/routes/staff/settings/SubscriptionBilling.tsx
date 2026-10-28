/**
 * @file SubscriptionBilling.tsx
 * @description The church's own view of where it stands on payment: the plan,
 * how long it is paid for, a payment waiting for approval, and past payments.
 *
 * Everything comes from the API. This screen used to show invented figures (a
 * card ending 4242, three made-up invoices), which is worse than showing nothing
 * on the one screen people come to when money is involved.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, Clock, Users, XCircle } from 'lucide-react';
import { billingService, formatPlanPrice } from '@/services/billingService';
import { membersService } from '@/services/membersService';
import { API_MODE } from '@/services/adapter';
import { useRole } from '@/hooks/useRole';
import { Badge, Button, Card, Skeleton, Text } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

const STATE_LABEL = {
  full: { text: 'Paid', variant: 'success' },
  basics: { text: 'Free basics', variant: 'warning' },
  view_only: { text: 'View only', variant: 'danger' },
  suspended: { text: 'Suspended', variant: 'danger' },
  closed: { text: 'Closed', variant: 'danger' },
} as const;

export function SubscriptionBilling() {
  const { can } = useRole();
  const overview = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => billingService.overview(),
    enabled: API_MODE === 'rest',
  });
  const plans = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingService.listPlans(),
    enabled: API_MODE === 'rest',
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  if (!can('org:read')) return <Navigate to="/403" replace />;

  const data = overview.data;
  const access = data?.access ?? null;
  const plan = plans.data?.find((p) => p.tier === data?.subscription?.tier);
  const state = access ? STATE_LABEL[access.state] : null;
  const limit = plan?.maxMembers ?? null;
  const ratio = limit ? members.length / limit : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">Plan &amp; billing</Text>
        <Text variant="body" color="muted">What you are on, how long it is paid for, and what you have paid.</Text>
      </header>

      {API_MODE !== 'rest' && (
        <Card padding="md"><Text variant="body-sm" color="muted">Billing shows real figures when the app is connected to the live API.</Text></Card>
      )}
      {overview.isPending && API_MODE === 'rest' && <Skeleton className="h-32 w-full rounded-xl" />}
      {overview.isError && (
        <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-4 text-body-sm text-danger">
          {errorMessage(overview.error)}{' '}
          <button type="button" className="font-bold underline" onClick={() => overview.refetch()}>Try again</button>
        </div>
      )}

      {data && access && state && (
        <>
          <Card variant="outline" padding="md" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Text variant="label" color="muted">Current plan</Text>
                <Text variant="h2" className="capitalize">
                  {access.state === 'full' ? (data.subscription?.tier ?? data.tier) : 'Free basics'}
                </Text>
              </div>
              <Badge variant={state.variant} dot className="shrink-0">{state.text}</Badge>
            </div>

            {access.state === 'full' && access.periodEnd && (
              <Text variant="body-sm" color="muted">
                Paid until <strong>{formatDate(access.periodEnd)}</strong>
                {access.daysLeft !== null && ` (${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left)`}.
              </Text>
            )}
            {access.state === 'basics' && (
              <Text variant="body-sm" color="muted">
                Free basics (people, attendance, gatherings) work
                {access.graceEndsAt ? ` until ${formatDate(access.graceEndsAt)}` : ''}. Everything else unlocks when you pay.
              </Text>
            )}
            {access.state === 'view_only' && (
              <Text variant="body-sm" color="muted">
                You can look at your information, but not add or change anything, until you pay. Nothing has been deleted.
              </Text>
            )}

            {data.pendingPayment ? (
              <div className="flex items-start gap-2 rounded-lg bg-warning-light p-3 text-body-sm text-warning">
                <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Your payment of {formatPlanPrice(data.pendingPayment.sentAmountCents, data.pendingPayment.currency)} (ref{' '}
                  <span className="font-mono">{data.pendingPayment.referenceCode}</span>) is waiting for approval.
                </span>
              </div>
            ) : (
              <>
                {data.lastPayment?.status === 'rejected' && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-light p-3 text-body-sm text-danger">
                    <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      Your last payment was not approved{data.lastPayment.decisionNote ? `: ${data.lastPayment.decisionNote}` : '.'}
                    </span>
                  </div>
                )}
                {can('billing:manage') ? (
                  <Link to="/onboarding/plan" className="block">
                    <Button variant="primary" fullWidth rightIcon={ArrowUpRight}>
                      {access.state === 'full' ? 'Renew or change plan' : 'Choose a plan and pay'}
                    </Button>
                  </Link>
                ) : (
                  <Text variant="body-sm" color="muted">Ask your church leader to pay for the plan.</Text>
                )}
              </>
            )}
          </Card>

          {limit !== null && (
            <div>
              <Text variant="h2" className="mb-3">Usage</Text>
              <Card padding="md">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="shrink-0 text-slate-400" aria-hidden />
                    <Text variant="body-sm">Members</Text>
                  </div>
                  <Text variant="caption" className={cn('tabular-nums', ratio > 0.8 ? 'font-medium text-warning' : 'text-slate-500')}>
                    {members.length} / {limit}
                  </Text>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn('h-full rounded-full', ratio > 0.8 ? 'bg-warning' : 'bg-primary')}
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                </div>
              </Card>
            </div>
          )}

          <div>
            <Text variant="h2" className="mb-3">Payments</Text>
            {data.payments.length === 0 ? (
              <Card padding="md"><Text variant="body-sm" color="muted">No payments yet.</Text></Card>
            ) : (
              <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Text variant="body-sm">{p.paidAt ? formatDate(p.paidAt) : '—'}</Text>
                      {p.description && <Text variant="caption" color="muted" className="truncate">{p.description}</Text>}
                    </div>
                    <Text variant="body-sm" className="shrink-0 font-medium tabular-nums">
                      {formatPlanPrice(p.amountCents, p.currency)}
                    </Text>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
