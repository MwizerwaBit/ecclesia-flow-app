/**
 * @file FinanceDashboard.tsx
 * @description Finance home — this week at a glance, then the way into the work.
 *
 * Open batches are shown as an alert rather than a statistic: unreconciled money
 * is the one thing on this screen that needs someone to act today.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BarChart3,
  FileText,
  PiggyBank,
  Target,
  Wallet,
} from 'lucide-react';
import { financeService } from '@/services/financeService';
import { Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact, formatDate, formatPercent } from '@/lib/formatters';

export function FinanceDashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => financeService.getDashboard(),
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches'],
    queryFn: () => financeService.listBatches(),
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: () => financeService.listFunds(),
  });

  const openBatches = batches.filter((b) => b.status === 'open');

  const weekChange =
    dashboard && dashboard.lastWeekTotal > 0
      ? (dashboard.thisWeekTotal - dashboard.lastWeekTotal) / dashboard.lastWeekTotal
      : 0;

  const yearChange =
    dashboard && dashboard.lastYearTotal > 0
      ? (dashboard.yearToDateTotal - dashboard.lastYearTotal) / dashboard.lastYearTotal
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Giving
        </Text>
        <Text variant="body" color="muted">
          Where the congregation&rsquo;s generosity stands this week.
        </Text>
      </header>

      {/* Unreconciled money is an action, not a number */}
      {openBatches.length > 0 && (
        <Card variant="outline" padding="md" className="border-warning/40 bg-warning-light/40">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <Text variant="h3" className="mb-0.5">
                {openBatches.length} batch{openBatches.length > 1 ? 'es' : ''} still open
              </Text>
              <Text variant="body-sm" color="muted">
                {openBatches.map((b) => b.name).join(', ')} — counted but not yet reconciled.
              </Text>
              <Link to={`/staff/finance/batches/${openBatches[0].id}/review`}>
                <Button variant="secondary" size="sm" className="mt-3" rightIcon={ArrowRight}>
                  Reconcile now
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="This week"
          value={formatCurrency(dashboard?.thisWeekTotal ?? 0)}
          icon={Wallet}
          trend={
            dashboard
              ? {
                  direction: weekChange >= 0 ? 'up' : 'down',
                  label: `${formatPercent(Math.abs(weekChange), 0)} vs last week`,
                }
              : undefined
          }
        />
        <StatTile
          label="Year to date"
          value={formatCurrencyCompact(dashboard?.yearToDateTotal ?? 0)}
          icon={PiggyBank}
          trend={
            dashboard
              ? {
                  direction: yearChange >= 0 ? 'up' : 'down',
                  label: `${formatPercent(Math.abs(yearChange), 0)} vs last year`,
                }
              : undefined
          }
        />
        <StatTile
          label="Pledges fulfilled"
          value={formatPercent(dashboard?.pledgeProgress ?? 0, 0)}
          icon={Target}
          hint="Across all active pledges"
        />
        <StatTile
          label="Open batches"
          value={String(openBatches.length)}
          icon={Banknote}
          hint={openBatches.length === 0 ? 'All reconciled' : 'Needs reconciling'}
        />
      </div>

      {/* From lg up the breakdown and the batches sit side by side rather than
          stacking into a very long column. */}
      <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">By fund</Text>
          <Link to="/staff/finance/funds">
            <Button variant="link" size="sm">
              Manage funds
            </Button>
          </Link>
        </div>

        <Card padding="md" className="space-y-4">
          {funds.map((fund) => {
            const share = dashboard
              ? (dashboard.fundBreakdown.find((f) => f.fundName === fund.name)?.percentage ?? 0)
              : 0;
            const targetProgress = fund.target ? fund.totalReceived / fund.target : null;

            return (
              <div key={fund.id}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <Text variant="body" className="truncate">
                    {fund.name}
                  </Text>
                  <Text variant="body" className="tabular-nums font-medium shrink-0">
                    {formatCurrency(fund.totalReceived)}
                  </Text>
                </div>

                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-slow"
                    style={{ width: `${Math.min(100, (targetProgress ?? share) * 100)}%` }}
                  />
                </div>

                {targetProgress !== null && (
                  <Text variant="caption" color="muted" className="mt-1 block">
                    {formatPercent(targetProgress, 0)} of {formatCurrencyCompact(fund.target ?? 0)}{' '}
                    target
                  </Text>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* The rest of the finance module, reachable from where the numbers are */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/staff/finance/pledges">
          <Button variant="secondary" fullWidth leftIcon={Target}>
            Pledges
          </Button>
        </Link>
        <Link to="/staff/finance/reports">
          <Button variant="secondary" fullWidth leftIcon={BarChart3}>
            Reports
          </Button>
        </Link>
        <Link to="/staff/finance/funds">
          <Button variant="secondary" fullWidth leftIcon={PiggyBank}>
            Funds
          </Button>
        </Link>
        <Link to="/staff/finance/statements">
          <Button variant="secondary" fullWidth leftIcon={FileText}>
            Statements
          </Button>
        </Link>
      </div>

      {/* Recent batches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">Recent batches</Text>
          <Link to="/staff/finance/batches">
            <Button variant="link" size="sm">
              See all
            </Button>
          </Link>
        </div>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {batches.slice(0, 4).map((batch) => (
            <Link
              key={batch.id}
              to={
                batch.status === 'open'
                  ? `/staff/finance/batches/${batch.id}/donations/new`
                  : `/staff/finance/batches/${batch.id}/review`
              }
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="min-w-0">
                <Text variant="body" className="truncate">
                  {batch.name}
                </Text>
                <Text variant="caption" color="muted">
                  {formatDate(batch.date)} · {batch.donationCount} gifts
                </Text>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Text variant="body" className="tabular-nums font-medium">
                  {formatCurrency(batch.totalAmount)}
                </Text>
                <Badge
                  variant={
                    batch.status === 'open' ? 'warning' : batch.status === 'closed' ? 'info' : 'success'
                  }
                  size="sm"
                >
                  {batch.status}
                </Badge>
              </div>
            </Link>
          ))}
        </Card>
      </div>
      </div>
    </div>
  );
}
