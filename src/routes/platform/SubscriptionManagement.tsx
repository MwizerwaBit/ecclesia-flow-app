/**
 * @file SubscriptionManagement.tsx
 * @description PA-06 — change a church's tier, trial, discount or payment state.
 *
 * Every action here moves money, so each one states its effective date before it
 * is taken: "at next renewal" and "immediately" are very different promises to
 * have made on a support call.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  BadgePercent,
  CalendarPlus,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  XCircle,
} from 'lucide-react';
import type { OrgTier } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, Button, Card, Input, SegmentedControl, Select, Text } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';

type Timing = 'immediate' | 'renewal';

const TIERS: Array<{ value: OrgTier; label: string; monthly: number }> = [
  { value: 'seed', label: 'Seed', monthly: 19 },
  { value: 'parish', label: 'Parish', monthly: 49 },
  { value: 'growth', label: 'Growth', monthly: 99 },
  { value: 'diocese', label: 'Diocese', monthly: 299 },
  { value: 'enterprise', label: 'Enterprise', monthly: 799 },
];

const MOCK_INVOICES = [
  { id: 'in1', date: '2024-10-01', amount: 49, status: 'paid' as const },
  { id: 'in2', date: '2024-09-01', amount: 49, status: 'paid' as const },
  { id: 'in3', date: '2024-08-01', amount: 49, status: 'paid' as const },
  { id: 'in4', date: '2024-07-01', amount: 49, status: 'refunded' as const },
];

export function SubscriptionManagement() {
  const { id = '' } = useParams();

  const [tier, setTier] = useState<OrgTier | ''>('');
  const [timing, setTiming] = useState<Timing>('renewal');
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [extendDays, setExtendDays] = useState('');
  const [extendNote, setExtendNote] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const { data: org } = useQuery({
    queryKey: ['platform', 'org', id],
    queryFn: () => platformService.getOrg(id),
    enabled: Boolean(id),
  });

  const activeTier = (tier || org?.tier) as OrgTier | undefined;
  const tierPricing = TIERS.find((t) => t.value === activeTier);
  const currentPricing = TIERS.find((t) => t.value === org?.tier);
  const isChangingTier = Boolean(tier) && tier !== org?.tier;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Subscription
        </Text>
        <Text variant="body" color="muted">
          {org?.displayName ?? 'Loading…'}
        </Text>
      </header>

      {/* Where things stand */}
      <Card variant="outline" padding="md" className="space-y-2.5">
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Current tier
          </Text>
          <Text variant="body-sm" className="font-medium capitalize">
            {org?.tier} · {currentPricing ? formatCurrency(currentPricing.monthly) : '—'}/mo
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Status
          </Text>
          <Badge variant={org?.status === 'active' ? 'success' : 'warning'} size="sm">
            {org?.status}
          </Badge>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            {org?.trialEndsAt ? 'Trial ends' : 'Next renewal'}
          </Text>
          <Text variant="body-sm" className="font-medium">
            {formatDate(org?.trialEndsAt ?? org?.renewalDate ?? new Date())}
          </Text>
        </div>
      </Card>

      {/* Tier change */}
      <div>
        <Text variant="h2" className="mb-3">
          Change tier
        </Text>
        <Card padding="md" className="space-y-4">
          <Select
            label="New tier"
            value={activeTier ?? ''}
            onChange={(e) => setTier(e.target.value as OrgTier)}
            options={TIERS.map((t) => ({
              value: t.value,
              label: `${t.label} — ${formatCurrency(t.monthly)}/mo`,
            }))}
          />

          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              When it takes effect
            </Text>
            <SegmentedControl
              label="Change timing"
              value={timing}
              onChange={setTiming}
              size="sm"
              options={[
                { value: 'renewal', label: 'At next renewal' },
                { value: 'immediate', label: 'Immediately' },
              ]}
            />
          </div>

          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Billing cycle
            </Text>
            <SegmentedControl
              label="Billing cycle"
              value={cycle}
              onChange={setCycle}
              size="sm"
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'annual', label: 'Annual (2 months free)' },
              ]}
            />
          </div>

          {isChangingTier && tierPricing && currentPricing && (
            <div className="rounded-lg bg-primary-light dark:bg-primary/15 px-3 py-2.5">
              <Text variant="caption" className="text-primary">
                {timing === 'immediate'
                  ? `Charged ${formatCurrency(Math.max(0, tierPricing.monthly - currentPricing.monthly))} pro-rata today, then ${formatCurrency(tierPricing.monthly)}/mo.`
                  : `Stays on ${org?.tier} until ${formatDate(org?.renewalDate ?? new Date())}, then ${formatCurrency(tierPricing.monthly)}/mo.`}
              </Text>
            </div>
          )}

          <Button variant="primary" fullWidth disabled={!isChangingTier}>
            Apply tier change
          </Button>
        </Card>
      </div>

      {/* Trial extension */}
      <div>
        <Text variant="h2" className="mb-3">
          Extend trial
        </Text>
        <Card padding="md" className="space-y-4">
          <Input
            label="Additional days"
            inputMode="numeric"
            placeholder="14"
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Input
            label="Reason"
            placeholder="Required — why this trial is being extended"
            value={extendNote}
            onChange={(e) => setExtendNote(e.target.value)}
          />
          <Button
            variant="secondary"
            fullWidth
            leftIcon={CalendarPlus}
            disabled={!extendDays || extendNote.trim().length === 0}
          >
            Extend by {extendDays || '0'} days
          </Button>
        </Card>
      </div>

      {/* Discount */}
      <div>
        <Text variant="h2" className="mb-3">
          Discount
        </Text>
        <Card padding="md" className="space-y-4">
          <Input
            label="Percentage off"
            inputMode="numeric"
            placeholder="20"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value.replace(/[^0-9]/g, ''))}
          />
          {discountPercent && tierPricing && (
            <Text variant="caption" color="muted">
              Brings the monthly charge to{' '}
              {formatCurrency(tierPricing.monthly * (1 - Number(discountPercent) / 100))}.
            </Text>
          )}
          <Button variant="secondary" fullWidth leftIcon={BadgePercent} disabled={!discountPercent}>
            Apply discount
          </Button>
        </Card>
      </div>

      {/* Manual payment + processor */}
      <div>
        <Text variant="h2" className="mb-3">
          Payments
        </Text>
        <Card padding="md" className="space-y-3">
          <Button variant="secondary" fullWidth leftIcon={Check}>
            Mark as paid manually
          </Button>
          <Text variant="caption" color="muted">
            For bank transfer and mobile money, which never touch the card processor.
          </Text>
          <Button variant="ghost" fullWidth rightIcon={ExternalLink}>
            Open in payment processor
          </Button>
        </Card>
      </div>

      {/* Invoices */}
      <div>
        <Text variant="h2" className="mb-3">
          Invoices
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {MOCK_INVOICES.map((invoice) => (
            <div key={invoice.id} className="flex items-center gap-3 px-4 py-3">
              <FileText size={16} className="text-slate-400 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <Text variant="body-sm">{formatDate(invoice.date)}</Text>
              </div>
              <Text variant="body-sm" className="tabular-nums font-medium shrink-0">
                {formatCurrency(invoice.amount)}
              </Text>
              <Badge
                variant={invoice.status === 'paid' ? 'success' : 'neutral'}
                size="sm"
                className="shrink-0"
              >
                {invoice.status}
              </Badge>
            </div>
          ))}
        </Card>
        <Button variant="ghost" fullWidth className="mt-3" leftIcon={CreditCard}>
          Generate an invoice
        </Button>
      </div>

      <Button variant="ghost" fullWidth leftIcon={XCircle}>
        Cancel subscription
      </Button>
    </div>
  );
}
