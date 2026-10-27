/**
 * @file PlanPicker.tsx
 * @description The step after the setup wizard: pick a plan and go and pay.
 *
 * A new church is pending until payment clears, so this is where setup
 * continues. Checkout is the payment provider's own hosted page, which sends the
 * person back to /onboarding?checkout=success (handled by CheckoutReturn).
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { billingService, formatPlanPrice } from '@/services/billingService';
import type { BillingInterval, OrgTier } from '@/types';
import { Button, Card, SegmentedControl, Text } from '@/components/ui';
import { errorMessage } from '@/lib/errors';

export function PlanPicker() {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [choosing, setChoosing] = useState<OrgTier | null>(null);

  const plans = useQuery({ queryKey: ['billing', 'plans'], queryFn: () => billingService.listPlans() });

  const checkout = useMutation({
    mutationFn: (tier: OrgTier) => billingService.checkout(tier, interval),
    onSuccess: (session) => window.location.assign(session.checkoutUrl),
    onSettled: () => setChoosing(null),
  });

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Text variant="h1" className="text-primary mb-2">Choose your plan</Text>
          <Text variant="body" color="muted">
            Your church is set up. Pick a plan and pay to switch it on; what you entered during setup is kept and saved
            once payment clears.
          </Text>
        </div>

        <div className="mb-6 flex justify-center">
          <SegmentedControl
            label="Billing interval"
            value={interval}
            onChange={setInterval}
            options={[
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
            ]}
          />
        </div>

        {plans.isPending && <Text variant="body" color="muted" className="text-center">Loading plans…</Text>}
        {plans.isError && (
          <div role="alert" className="p-4 bg-danger-light text-danger rounded-lg text-body-sm font-medium border border-danger/20">
            {errorMessage(plans.error)}{' '}
            <button type="button" className="underline font-bold" onClick={() => plans.refetch()}>
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {plans.data?.map((plan) => {
            const cents = interval === 'month' ? plan.monthlyCents : plan.yearlyCents;
            return (
              <Card key={plan.tier} padding="lg" className="flex flex-col">
                <Text variant="h3">{plan.name}</Text>
                <Text variant="body-sm" color="muted" className="mb-3">{plan.tagline}</Text>
                <Text variant="h2" className="mb-1">
                  {formatPlanPrice(cents)}
                  {cents !== null && (
                    <span className="text-body-sm font-normal text-slate-500"> / {interval === 'month' ? 'month' : 'year'}</span>
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
                    disabled={choosing !== null}
                    onClick={() => {
                      setChoosing(plan.tier);
                      checkout.mutate(plan.tier);
                    }}
                  >
                    Choose {plan.name}
                  </Button>
                ) : (
                  <Text variant="body-sm" color="muted">Contact us to arrange this plan.</Text>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
