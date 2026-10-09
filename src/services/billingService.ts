/**
 * @file billingService.ts
 * @description Plans, checkout and the demo payment page.
 *
 * Checkout returns a URL: with Stripe configured on the API it is Stripe's
 * hosted page; otherwise it is this app's own /billing/checkout/:id demo page,
 * which pays with test cards through the same webhook path Stripe would use.
 */
import type { BillingInterval, BillingOverview, CheckoutSession, DemoCheckout, OrgTier, Plan } from '@/types';
import { apiRequest, requireApi } from './adapter';

export const billingService = {
  /** Public — no session needed. */
  async listPlans(): Promise<Plan[]> {
    requireApi('Plans');
    return apiRequest<Plan[]>('/billing/plans', { skipAuth: true });
  },

  async overview(): Promise<BillingOverview> {
    requireApi('Billing');
    return apiRequest<BillingOverview>('/billing/overview');
  },

  async checkout(tier: OrgTier, interval: BillingInterval): Promise<CheckoutSession> {
    requireApi('Checkout');
    return apiRequest<CheckoutSession>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, interval }),
    });
  },

  async getDemoCheckout(sessionId: string): Promise<DemoCheckout> {
    requireApi('Checkout');
    return apiRequest<DemoCheckout>(`/billing/demo/checkout/${encodeURIComponent(sessionId)}`);
  },

  /** Test cards only: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. */
  async payDemoCheckout(
    sessionId: string,
    card: { cardNumber: string; nameOnCard: string },
  ): Promise<{ status: 'paid' | 'declined'; orgStatus: string }> {
    requireApi('Checkout');
    return apiRequest(`/billing/demo/checkout/${encodeURIComponent(sessionId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(card),
    });
  },
};

/** "$49" / "$490" from cents, in the plan's currency. */
export function formatPlanPrice(cents: number | null, currency = 'usd'): string {
  if (cents === null) return 'Contact us';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
