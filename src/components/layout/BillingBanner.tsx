/**
 * @file BillingBanner.tsx
 * @description The strip at the top of the staff screens that says where the
 * church stands on payment, and what to do about it.
 *
 *   basics     free modules only, until the grace days end
 *   view_only  nothing can be changed
 *   renewal    the last week of a paid plan
 *
 * Silent when the church is paid up, so it never becomes wallpaper.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Eye } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { useRole } from '@/hooks/useRole';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function BillingBanner() {
  const { access } = useAccess();
  const { can } = useRole();
  if (!access || access.state === 'suspended' || access.state === 'closed') return null;

  const canPay = can('org:settings');
  const pay = canPay ? (
    <Link to="/staff/settings/billing" className="font-semibold underline underline-offset-2 whitespace-nowrap">
      {access.paymentPending ? 'See your payment' : access.state === 'full' ? 'Renew' : 'Choose a plan'}
    </Link>
  ) : (
    <span>Ask your church leader to pay.</span>
  );

  let tone: 'warning' | 'danger' | 'info';
  let Icon = Clock;
  let message: string;

  if (access.state === 'view_only') {
    tone = 'danger';
    Icon = Eye;
    message = access.paymentPending
      ? 'Your church is view-only. Your payment is waiting for approval.'
      : 'Your church is view-only: you can look, but not add or change anything until the plan is paid.';
  } else if (access.state === 'basics') {
    tone = 'warning';
    Icon = AlertTriangle;
    const until = access.graceEndsAt ? ` until ${formatDate(access.graceEndsAt)}` : '';
    message = access.paymentPending
      ? 'Your payment is waiting for approval. Free basics stay on meanwhile.'
      : `Free basics are on${until}. The greyed-out parts unlock when your plan is paid.`;
  } else if (access.renewalDue && access.daysLeft !== null) {
    tone = 'info';
    message =
      access.daysLeft <= 0
        ? 'Your plan ends today.'
        : `Your plan ends in ${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'}${access.periodEnd ? ` (${formatDate(access.periodEnd)})` : ''}.`;
    if (access.paymentPending) message += ' Your renewal is waiting for approval.';
  } else {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-body-sm border-b',
        tone === 'danger' && 'bg-danger-light text-danger border-danger/20',
        tone === 'warning' && 'bg-warning-light text-warning border-warning/20',
        tone === 'info' && 'bg-info-light text-info border-info/20',
      )}
    >
      <Icon size={16} className="shrink-0" aria-hidden />
      <span className="flex-1 min-w-48">{message}</span>
      {!(access.paymentPending && access.state === 'full') && pay}
    </div>
  );
}
