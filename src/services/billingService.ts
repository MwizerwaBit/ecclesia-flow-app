/**
 * @file billingService.ts
 * @description Plans, checkout and the demo payment page.
 *
 * Checkout returns a URL: with Stripe configured on the API it is Stripe's
 * hosted page; otherwise it is this app's own /billing/checkout/:id demo page,
 * which pays with test cards through the same webhook path Stripe would use.
 */
import type {
  Access,
  BillingInterval,
  BillingOverview,
  CheckoutSession,
  DemoCheckout,
  ManualPayment,
  OrgTier,
  PaymentInstructions,
  Plan,
} from '@/types';
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

  /** What the church may do right now; open to every signed-in person of the church. */
  async access(): Promise<Access | null> {
    requireApi('Billing');
    return apiRequest<Access | null>('/billing/access');
  },

  async checkout(tier: OrgTier, interval: BillingInterval): Promise<CheckoutSession> {
    requireApi('Checkout');
    return apiRequest<CheckoutSession>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, interval }),
    });
  },

  /** Where to send the mobile money, and how much, for the plan and months chosen. */
  async paymentInstructions(tier: OrgTier, months: number, currency?: string): Promise<PaymentInstructions> {
    requireApi('Payment');
    const query = `tier=${tier}&months=${months}${currency ? `&currency=${encodeURIComponent(currency)}` : ''}`;
    return apiRequest<PaymentInstructions>(`/billing/manual/instructions?${query}`);
  },

  /** Reports a mobile-money payment with its proof (PNG, JPEG or PDF up to 10 MB). */
  async submitManualPayment(input: {
    tier: OrgTier;
    months: number;
    senderName: string;
    sentAmountCents: number;
    currency?: string;
    momoTransactionId?: string;
    proof: File;
  }): Promise<ManualPayment> {
    requireApi('Payment');
    const body = new FormData();
    body.append('tier', input.tier);
    body.append('months', String(input.months));
    body.append('sender_name', input.senderName);
    body.append('sent_amount_cents', String(input.sentAmountCents));
    if (input.currency) body.append('currency', input.currency);
    if (input.momoTransactionId) body.append('momo_transaction_id', input.momoTransactionId);
    body.append('proof', input.proof);
    return apiRequest<ManualPayment>('/billing/manual/payments', { method: 'POST', body, rawBody: true });
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

/** The longest stretch that can be paid for in one go. Matches the API. */
export const MAX_MONTHS = 36;

/**
 * What `months` months cost: whole years at the yearly price, the rest at the
 * monthly rate, never more than a year. The same sum the API does; the API's
 * figure is the one that counts, this is for showing a price before paying.
 */
export function priceForMonths(plan: Pick<Plan, 'monthlyCents' | 'yearlyCents'>, months: number): number | null {
  if (plan.monthlyCents === null || plan.yearlyCents === null) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years * plan.yearlyCents + (rest ? Math.min(rest * plan.monthlyCents, plan.yearlyCents) : 0);
}

/** "3 months", "1 year", "1 year 2 months". */
export function describeMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years ? `${years} year${years === 1 ? '' : 's'}` : '';
  const m = rest ? `${rest} month${rest === 1 ? '' : 's'}` : '';
  return [y, m].filter(Boolean).join(' ');
}

/** "$49" / "$490" from cents, in the plan's currency. */
export function formatPlanPrice(cents: number | null, currency = 'usd'): string {
  if (cents === null) return 'Contact us';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
