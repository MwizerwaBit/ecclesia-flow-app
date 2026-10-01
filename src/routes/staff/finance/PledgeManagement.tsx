/**
 * @file PledgeManagement.tsx
 * @description Who has pledged what, and how far along they are.
 *
 * Overdue pledges lead the list by default. A pledge is a relationship rather
 * than a debt, so the language stays neutral — "behind" rather than "delinquent"
 * — and every row links to the person, not to a collections action.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import type { Pledge } from '@/types';
import { financeService } from '@/services/financeService';
import { Badge, Card, EmptyState, SegmentedControl, StatTile, Text } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact, formatDate, formatPercent } from '@/lib/formatters';

type Filter = 'all' | Pledge['status'];

const STATUS_BADGE: Record<
  Pledge['status'],
  { variant: 'success' | 'info' | 'warning' | 'neutral'; label: string }
> = {
  active: { variant: 'info', label: 'On track' },
  fulfilled: { variant: 'success', label: 'Fulfilled' },
  overdue: { variant: 'warning', label: 'Behind' },
  canceled: { variant: 'neutral', label: 'Cancelled' },
};

export function PledgeManagement() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: pledges = [], isLoading } = useQuery({
    queryKey: ['pledges'],
    queryFn: () => financeService.listPledges(),
  });

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? pledges : pledges.filter((p) => p.status === filter);
    // Those needing attention first, fulfilled last.
    const weight: Record<Pledge['status'], number> = {
      overdue: 0,
      active: 1,
      fulfilled: 2,
      canceled: 3,
    };
    return [...filtered].sort((a, b) => weight[a.status] - weight[b.status]);
  }, [pledges, filter]);

  const pledgedTotal = pledges.reduce((sum, p) => sum + p.pledgeAmount, 0);
  const fulfilledTotal = pledges.reduce((sum, p) => sum + p.amountFulfilled, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Pledges
        </Text>
        <Text variant="body" color="muted">
          Commitments made toward your funds.
        </Text>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatTile
          label="Pledged"
          value={formatCurrencyCompact(pledgedTotal)}
          icon={Target}
          hint={`${pledges.length} pledges`}
        />
        <StatTile
          label="Received"
          value={formatCurrencyCompact(fulfilledTotal)}
          hint={
            pledgedTotal > 0 ? `${formatPercent(fulfilledTotal / pledgedTotal, 0)} of pledged` : undefined
          }
        />
      </div>

      <SegmentedControl
        label="Pledge status"
        value={filter}
        onChange={setFilter}
        size="sm"
        className="mb-5"
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'On track' },
          { value: 'overdue', label: 'Behind' },
          { value: 'fulfilled', label: 'Fulfilled' },
        ]}
      />

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading pledges…
        </Text>
      )}

      {!isLoading && visible.length === 0 && (
        <EmptyState
          icon={Target}
          title="No pledges here"
          description="A pledge records what someone has committed toward a fund over a period."
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {visible.map((pledge) => {
          const progress = pledge.pledgeAmount > 0 ? pledge.amountFulfilled / pledge.pledgeAmount : 0;
          const badge = STATUS_BADGE[pledge.status];
          const remaining = Math.max(0, pledge.pledgeAmount - pledge.amountFulfilled);

          return (
            <Card key={pledge.id} padding="md" variant="elevated">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <Link to={`/staff/members/${pledge.memberId}`}>
                    <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
                      {pledge.memberName}
                    </p>
                  </Link>
                  <Text variant="caption" color="muted">
                    {pledge.fundName} · {pledge.frequency ?? 'one-time'}
                  </Text>
                </div>
                <Badge variant={badge.variant} size="sm" className="shrink-0">
                  {badge.label}
                </Badge>
              </div>

              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-slow"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>

              <div className="flex justify-between mt-1.5">
                <Text variant="caption" color="muted" className="tabular-nums">
                  {formatCurrency(pledge.amountFulfilled)} of {formatCurrency(pledge.pledgeAmount)}
                </Text>
                <Text variant="caption" color="muted" className="tabular-nums">
                  {remaining > 0 ? `${formatCurrency(remaining)} remaining` : 'Complete'}
                </Text>
              </div>

              <Text variant="caption" color="muted" className="block mt-1">
                Through {formatDate(pledge.endDate)}
              </Text>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
