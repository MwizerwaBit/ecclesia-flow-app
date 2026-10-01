/**
 * @file GivingReports.tsx
 * @description Giving over time, by fund, at three zoom levels.
 *
 * The trend is drawn as inline SVG bars rather than pulled from a chart library:
 * it is six to twelve values with no interaction beyond reading them, and a
 * charting dependency for that would cost more to load than the screen itself.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp } from 'lucide-react';
import { financeService } from '@/services/financeService';
import { Button, Card, SegmentedControl, StatTile, Text } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/formatters';

type Period = 'weekly' | 'monthly' | 'annual';

/** Illustrative series per zoom level — the shape a real reporting endpoint returns. */
const TRENDS: Record<Period, Array<{ label: string; amount: number }>> = {
  weekly: [
    { label: 'W1', amount: 3980 },
    { label: 'W2', amount: 4410 },
    { label: 'W3', amount: 5120 },
    { label: 'W4', amount: 4250 },
  ],
  monthly: [
    { label: 'May', amount: 14200 },
    { label: 'Jun', amount: 15800 },
    { label: 'Jul', amount: 13900 },
    { label: 'Aug', amount: 16100 },
    { label: 'Sep', amount: 17600 },
    { label: 'Oct', amount: 17760 },
  ],
  annual: [
    { label: '2021', amount: 98400 },
    { label: '2022', amount: 118200 },
    { label: '2023', amount: 138200 },
    { label: '2024', amount: 142500 },
  ],
};

export function GivingReports() {
  const [period, setPeriod] = useState<Period>('monthly');

  const { data: dashboard } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => financeService.getDashboard(),
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['funds'],
    queryFn: () => financeService.listFunds(),
  });

  const trend = TRENDS[period];
  const peak = Math.max(...trend.map((t) => t.amount));
  const periodTotal = trend.reduce((sum, t) => sum + t.amount, 0);

  const change = useMemo(() => {
    if (trend.length < 2) return 0;
    const [previous, latest] = [trend[trend.length - 2].amount, trend[trend.length - 1].amount];
    return previous > 0 ? (latest - previous) / previous : 0;
  }, [trend]);

  const fundTotal = funds.reduce((sum, f) => sum + f.totalReceived, 0);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Giving reports
        </Text>
        <Text variant="body" color="muted">
          How generosity has moved over time.
        </Text>
      </header>

      <SegmentedControl
        label="Reporting period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'annual', label: 'Annual' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Period total"
          value={formatCurrencyCompact(periodTotal)}
          icon={TrendingUp}
        />
        <StatTile
          label="Latest vs previous"
          value={formatPercent(Math.abs(change), 0)}
          trend={{ direction: change >= 0 ? 'up' : 'down', label: change >= 0 ? 'up' : 'down' }}
        />
      </div>

      {/* Trend */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          Trend
        </Text>

        <div className="flex items-end justify-between gap-2 h-40">
          {trend.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <span className="text-caption text-slate-500 tabular-nums">
                {formatCurrencyCompact(point.amount)}
              </span>
              <div
                className="w-full rounded-t-md bg-primary transition-all duration-slow"
                style={{ height: `${Math.max(4, (point.amount / peak) * 100)}%` }}
                role="img"
                aria-label={`${point.label}: ${formatCurrency(point.amount)}`}
              />
              <span className="text-caption text-slate-400 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* By fund */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          By fund
        </Text>

        <div className="space-y-4">
          {funds.map((fund) => {
            const share = fundTotal > 0 ? fund.totalReceived / fundTotal : 0;
            return (
              <div key={fund.id}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <Text variant="body" className="truncate">
                    {fund.name}
                  </Text>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <Text variant="caption" color="muted" className="tabular-nums">
                      {formatPercent(share, 0)}
                    </Text>
                    <Text variant="body" className="tabular-nums font-medium">
                      {formatCurrencyCompact(fund.totalReceived)}
                    </Text>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-slow"
                    style={{ width: `${share * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {dashboard && (
        <Card variant="flat" padding="md" className="space-y-2">
          <div className="flex justify-between">
            <Text variant="body-sm" color="muted">
              Year to date
            </Text>
            <Text variant="body-sm" className="font-medium tabular-nums">
              {formatCurrency(dashboard.yearToDateTotal)}
            </Text>
          </div>
          <div className="flex justify-between">
            <Text variant="body-sm" color="muted">
              Same point last year
            </Text>
            <Text variant="body-sm" className="font-medium tabular-nums">
              {formatCurrency(dashboard.lastYearTotal)}
            </Text>
          </div>
        </Card>
      )}

      <Button variant="secondary" fullWidth leftIcon={Download}>
        Export this report
      </Button>
    </div>
  );
}
