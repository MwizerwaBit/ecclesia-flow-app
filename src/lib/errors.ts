/**
 * @file errors.ts
 * @description Human messages for API errors (see components/feedback/ErrorNotice).
 */
import { ApiError } from '@/services/adapter';
import { describeError } from '@/lib/formErrors';

export const GUIDANCE: Record<string, string> = {
  mfa_required: 'This needs two-step sign-in. Turn it on in Security settings, then sign in again with your code.',
  org_inactive: 'Your church isn’t active yet. Finish onboarding and payment, or wait for EcclesiaFlow to activate it.',
  org_suspended: 'This church is suspended. Contact EcclesiaFlow support.',
  privilege_escalation: 'You can’t give access you don’t have yourself.',
  out_of_scope: 'That’s outside the branch you’re responsible for.',
  leader_only: 'Only the church leader can do this.',
  subscription_required:
    'Your church’s plan has ended, so it is view-only. Renew from Billing to add or change things.',
  module_locked: 'That part is locked until your church’s plan is paid. Open Billing to pay.',
  payment_pending: 'A payment is already waiting for approval. You can send another once it is decided.',
  proof_reused: 'That screenshot was already submitted. Upload the screenshot of this payment.',
  transaction_reused: 'That MoMo transaction was already submitted.',
  step_up_required: 'Confirm with your two-step code to do this.',
  upgrade_required: 'Your plan doesn’t include this. Upgrade from Billing to turn it on.',
};

/** A short, human message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && GUIDANCE[error.code]) return GUIDANCE[error.code];
  // Names the rejected fields for a 422, and keeps network and server faults readable.
  return describeError(error, 'Something went wrong. Try again.');
}

