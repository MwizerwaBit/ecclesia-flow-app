/**
 * @file errors.ts
 * @description Human messages for API errors (see components/feedback/ErrorNotice).
 */
import { ApiError } from '@/services/adapter';

export const GUIDANCE: Record<string, string> = {
  mfa_required: 'This needs two-step sign-in. Turn it on in Security settings, then sign in again with your code.',
  org_inactive: 'Your church isn’t active yet. Finish onboarding and payment, or wait for EcclesiaFlow to activate it.',
  org_suspended: 'This church is suspended. Contact EcclesiaFlow support.',
  privilege_escalation: 'You can’t give access you don’t have yourself.',
  out_of_scope: 'That’s outside the branch you’re responsible for.',
  leader_only: 'Only the church leader can do this.',
  upgrade_required: 'Your plan doesn’t include this. Upgrade from Billing to turn it on.',
};

/** A short, human message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return GUIDANCE[error.code] ?? error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}

