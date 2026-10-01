/**
 * @file PlatformMetrics.tsx
 * @description PA-12 — business intelligence for the platform itself.
 *
 * "Time to first Sunday" is the metric that matters most here: a church that has
 * recorded attendance and a donation has actually adopted the product, whereas
 * one that has merely signed up has not.
 */
import { useQuery } from '@tanstack/react-query';
import { Download, Globe2, TrendingUp, UserMinus, Zap } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { Card, Button, StatTile, Text } from '@/components/ui';
import { formatCurrencyCompact, formatNumber, formatPercent } from '@/lib/formatters';

const CHURN = { d30: 0.018, d60: 0.031, d90: 0.044 };
const TRIAL_CONVERSION = 0.42;
const DAYS_TO_FIRST_SUNDAY = 9;

const BY_COUNTRY = [
  { country: 'United States', orgs: 3, members: 15760 },
  { country: 'Nigeria', orgs: 1, members: 8430 },
  { country: 'Kenya', orgs: 1, members: 1120 },
  { country: 'South Africa', orgs: 1, members: 310 },
  { country: 'United Kingdom', orgs: 1, members: 38 },
  { country: 'Ireland', orgs: 1, members: 176 },
];

const FEATURE_ADOPTION = [
  { feature: 'Attendance', rate: 0.94 },
  { feature: 'Giving', rate: 0.81 },
  { feature: 'Announcements', rate: 0.67 },
  { feature: 'Certificates', rate: 0.23 },
  { feature: 'Analytics', rate: 0.19 },
];

export function PlatformMetrics() {
  const { data: metrics } = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () => platformService.getMetrics(),
  });

  const { data: mrrTrend = [] } = useQuery({
    queryKey: ['platform', 'mrr'],
    queryFn: () => platformService.getMrrTrend(),
  });

  const peak = Math.max(...mrrTrend.map((p) => p.amount), 1);
  const topOrgs = [...BY_COUNTRY].sort((a, b) => b.members - a.members);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Platform metrics
        </Text>
        <Text variant="body" color="muted">
          How the business is doing, not the software.
        </Text>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="MRR"
          value={formatCurrencyCompact(metrics?.mrr ?? 0)}
          icon={TrendingUp}
          trend={{ direction: 'up', label: '9% this month' }}
        />
        <StatTile
          label="Trial to paid"
          value={formatPercent(TRIAL_CONVERSION, 0)}
          icon={Zap}
          hint="Last 90 days"
        />
        <StatTile
          label="Churn · 30d"
          value={formatPercent(CHURN.d30, 1)}
          icon={UserMinus}
          trend={{ direction: 'down', label: 'Lower is better' }}
          invertTrendColor
        />
        <StatTile
          label="Days to first Sunday"
          value={String(DAYS_TO_FIRST_SUNDAY)}
          hint="Signup to first attendance + gift"
        />
      </div>

      {/* MRR over time */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          MRR over time
        </Text>
        <div className="flex items-end justify-between gap-2 h-40">
          {mrrTrend.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <span className="text-caption text-slate-500 tabular-nums">
                {formatCurrencyCompact(point.amount)}
              </span>
              <div
                className="w-full rounded-t-md bg-platform-accent transition-all duration-slow"
                style={{ height: `${(point.amount / peak) * 100}%` }}
                role="img"
                aria-label={`${point.label}: ${formatCurrencyCompact(point.amount)}`}
              />
              <span className="text-caption text-slate-400 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Churn */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-3 block">
          Churn
        </Text>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '30 days', value: CHURN.d30 },
            { label: '60 days', value: CHURN.d60 },
            { label: '90 days', value: CHURN.d90 },
          ].map((window) => (
            <div key={window.label}>
              <Text variant="caption" color="muted">
                {window.label}
              </Text>
              <Text variant="h3" className="tabular-nums">
                {formatPercent(window.value, 1)}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Geography */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe2 size={18} className="text-slate-400" aria-hidden />
          <Text variant="h2">By country</Text>
        </div>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {topOrgs.map((row) => (
            <div key={row.country} className="flex items-center justify-between gap-3 px-4 py-3">
              <Text variant="body" className="truncate">
                {row.country}
              </Text>
              <Text variant="caption" color="muted" className="shrink-0 tabular-nums">
                {row.orgs} org{row.orgs === 1 ? '' : 's'} · {formatNumber(row.members)} members
              </Text>
            </div>
          ))}
        </Card>
      </div>

      {/* Adoption */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          Feature adoption
        </Text>
        <div className="space-y-3">
          {FEATURE_ADOPTION.map((feature) => (
            <div key={feature.feature}>
              <div className="flex justify-between gap-3 mb-1">
                <Text variant="body-sm">{feature.feature}</Text>
                <Text variant="body-sm" className="tabular-nums font-medium">
                  {formatPercent(feature.rate, 0)}
                </Text>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-platform-accent transition-all duration-slow"
                  style={{ width: `${feature.rate * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button variant="secondary" fullWidth leftIcon={Download}>
        Export all metrics
      </Button>
    </div>
  );
}
