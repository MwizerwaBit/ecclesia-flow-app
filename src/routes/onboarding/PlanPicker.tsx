/**
 * @file PlanPicker.tsx
 * @description Pick a plan and how long to pay for, then go and pay.
 *
 * With mobile-money billing (the default) the length is any number of months
 * from 1 to 36, and the next step is the payment page, where the church reports
 * what it sent. With a card provider (Stripe, or the demo page) the length is a
 * month or a year and the next step is the provider's hosted checkout.
 *
 * Reached at the end of setup, from the Billing page, and from the "choose a
 * plan" banner. A church can always say "not now": free basics keep working.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import {
  billingService,
  describeMonths,
  formatPlanPrice,
  MAX_MONTHS,
  priceForMonths,
} from '@/services/billingService';
import type { BillingInterval, OrgTier } from '@/types';
import { Button, Card, Input, SegmentedControl, Text } from '@/components/ui';
import { errorMessage } from '@/lib/errors';

type Preset = '1' | '3' | '6' | '12' | 'other';

export function PlanPicker() {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [preset, setPreset] = useState<Preset>('1');
  const [custom, setCustom] = useState('2');
  const [choosing, setChoosing] = useState<OrgTier | null>(null);

  const plans = useQuery({ queryKey: ['billing', 'plans'], queryFn: () => billingService.listPlans() });
  const overview = useQuery({ queryKey: ['billing', 'overview'], queryFn: () => billingService.overview() });
  const manual = overview.data?.provider === 'manual';

  const checkout = useMutation({
    mutationFn: (tier: OrgTier) => billingService.checkout(tier, interval),
    onSuccess: (session) => window.location.assign(session.checkoutUrl),
    onSettled: () => setChoosing(null),
  });

  const customMonths = Math.floor(Number(custom));
  const customValid = Number.isFinite(customMonths) && customMonths >= 1 && customMonths <= MAX_MONTHS;
  const months = preset === 'other' ? (customValid ? customMonths : 0) : Number(preset);

  function choose(tier: OrgTier) {
    if (manual) {
      navigate(`/billing/pay?tier=${tier}&months=${months}`);
      return;
    }
    setChoosing(tier);
    checkout.mutate(tier);
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Text variant="h1" className="text-primary mb-2">Choose your plan</Text>
          <Text variant="body" color="muted">
            {manual
              ? 'Pick a plan and how long to pay for. You send the money by mobile money, and your church is unlocked once we confirm it.'
              : 'Pick a plan and pay to switch your church on. What you entered during setup is kept.'}
          </Text>
        </div>

        <div className="mb-6 flex flex-col items-center gap-3">
          {manual ? (
            <>
              <SegmentedControl
                label="How long"
                value={preset}
                onChange={setPreset}
                options={[
                  { value: '1', label: '1 month' },
                  { value: '3', label: '3 months' },
                  { value: '6', label: '6 months' },
                  { value: '12', label: '1 year' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              {preset === 'other' && (
                <div className="w-44">
                  <Input
                    label="Number of months"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_MONTHS}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    error={customValid ? undefined : `Enter 1 to ${MAX_MONTHS}`}
                  />
                </div>
              )}
              {months >= 12 && (
                <Text variant="caption" color="muted">A full year costs 10 months: 2 months free.</Text>
              )}
            </>
          ) : (
            <SegmentedControl
              label="Billing interval"
              value={interval}
              onChange={setInterval}
              options={[
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ]}
            />
          )}
        </div>

        {(plans.isPending || overview.isPending) && (
          <Text variant="body" color="muted" className="text-center">Loading plans…</Text>
        )}
        {plans.isError && (
          <div role="alert" className="p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {errorMessage(plans.error)}{' '}
            <button type="button" className="underline font-bold" onClick={() => plans.refetch()}>
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {overview.data &&
            plans.data?.map((plan) => {
              const cents = manual
                ? months
                  ? priceForMonths(plan, months)
                  : null
                : interval === 'month'
                  ? plan.monthlyCents
                  : plan.yearlyCents;
              const per = manual ? describeMonths(months) : interval === 'month' ? 'month' : 'year';
              return (
                <Card key={plan.tier} padding="lg" className="flex flex-col">
                  <Text variant="h3">{plan.name}</Text>
                  <Text variant="body-sm" color="muted" className="mb-3">{plan.tagline}</Text>
                  <Text variant="h2" className="mb-1">
                    {formatPlanPrice(cents, plan.currency)}
                    {cents !== null && per && (
                      <span className="text-body-sm font-normal text-slate-500"> / {per}</span>
                    )}
                  </Text>
                  <ul className="my-4 space-y-1.5 flex-1">
                    <li className="flex items-center gap-2 text-body-sm">
                      <Check size={14} className="text-success shrink-0" aria-hidden />
                      {plan.maxMembers === null ? 'Unlimited members' : `Up to ${plan.maxMembers.toLocaleString()} members`}
                    </li>
                  </ul>
                  {plan.purchasable ? (
                    <Button
                      variant="primary"
                      fullWidth
                      isLoading={choosing === plan.tier}
                      disabled={choosing !== null || (manual && !months)}
                      onClick={() => choose(plan.tier)}
                    >
                      {manual ? `Continue with ${plan.name}` : `Choose ${plan.name}`}
                    </Button>
                  ) : (
                    <Text variant="body-sm" color="muted">Contact us to arrange this plan.</Text>
                  )}
                </Card>
              );
            })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/staff/dashboard" className="text-body-sm text-slate-500 underline underline-offset-2">
            Not now, continue with free basics
          </Link>
        </div>
      </div>
    </div>
  );
}
