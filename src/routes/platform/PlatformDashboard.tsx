/**
 * @file PlatformDashboard.tsx
 * @description PA-02 — the health of the whole platform on one screen.
 *
 * Trials ending inside seven days lead, because they are the only thing here
 * that is time-limited: every other number can be looked at tomorrow.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronRight,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';
import { platformService } from '@/services/platformService';
import { CRITICAL_ACTIONS } from '@/mocks/platform.mock';
import { Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatCurrencyCompact, formatDate, formatNumber, formatPercent, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function PlatformDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () => platformService.getMetrics(),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['platform', 'audit-log'],
    queryFn: () => platformService.listAuditLog(),
  });

  if (isLoading || !metrics) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading platform metrics…
      </Text>
    );
  }

  const isErrorRateHigh = metrics.errorRate > 0.01;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Platform
        </Text>
        <Text variant="body" color="muted">
          {metrics.activeOrgs} active organisations · {formatNumber(metrics.totalMembers)} members
        </Text>
      </header>

      {/* Time-limited first */}
      {metrics.trialsEndingIn7Days.length > 0 && (
        <Card variant="outline" padding="md" className="border-warning/40 bg-warning-light/40">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <Text variant="h3" className="mb-2">
                {metrics.trialsEndingIn7Days.length} trials ending this week
              </Text>
              <div className="space-y-1.5">
                {metrics.trialsEndingIn7Days.map((org) => (
                  <Link
                    key={org.id}
                    to={`/platform/orgs/${org.id}`}
                    className="flex items-center justify-between gap-3 group"
                  >
                    <Text variant="body-sm" className="truncate group-hover:text-primary transition-colors">
                      {org.displayName}
                    </Text>
                    <Text variant="caption" color="muted" className="shrink-0">
                      {org.trialEndsAt ? formatDate(org.trialEndsAt) : ''}
                    </Text>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Organisations" value={String(metrics.totalOrgs)} icon={Building2} />
        <StatTile label="MRR" value={formatCurrencyCompact(metrics.mrr)} icon={TrendingUp} />
        <StatTile
          label="Signups this month"
          value={String(metrics.newSignupsThisMonth)}
          icon={Users}
          hint={`${metrics.newSignupsToday} today`}
        />
        <StatTile
          label="Members"
          value={formatNumber(metrics.totalMembers)}
          hint="Anonymised count"
        />
      </div>

      {/* System health */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">System</Text>
          <Link to="/platform/system-health">
            <Button variant="link" size="sm">
              Full health
            </Button>
          </Link>
        </div>

        <Card padding="md">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Text variant="label" color="muted">
                API p95
              </Text>
              <Text variant="h3" className="tabular-nums">
                {metrics.apiP95Ms}ms
              </Text>
            </div>
            <div>
              <Text variant="label" color="muted">
                Error rate
              </Text>
              <Text
                variant="h3"
                className={cn('tabular-nums', isErrorRateHigh && 'text-danger')}
              >
                {formatPercent(metrics.errorRate, 2)}
              </Text>
            </div>
            <div>
              <Text variant="label" color="muted">
                Queue
              </Text>
              <Text variant="h3" className="tabular-nums">
                {metrics.queueDepth}
              </Text>
            </div>
          </div>

          {isErrorRateHigh && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <AlertTriangle size={15} className="text-danger shrink-0" aria-hidden />
              <Text variant="caption" className="text-danger">
                Error rate is above the 1% threshold.
              </Text>
            </div>
          )}
        </Card>
      </div>

      {/* Recent platform activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Text variant="h2">Recent actions</Text>
          <Link to="/platform/audit-log">
            <Button variant="link" size="sm">
              Full log
            </Button>
          </Link>
        </div>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {auditLog.slice(0, 6).map((entry) => {
            const isCritical = CRITICAL_ACTIONS.includes(entry.action);

            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Activity
                  size={16}
                  className={cn('shrink-0', isCritical ? 'text-warning' : 'text-slate-300')}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <Text variant="body-sm" className="truncate">
                    <span className="font-medium">{entry.userName}</span> · {entry.action}
                  </Text>
                  <Text variant="caption" color="muted" className="truncate block">
                    {entry.orgName} · {formatRelative(entry.createdAt)}
                  </Text>
                </div>
                {entry.isImpersonated && (
                  <Badge variant="warning" size="sm" className="shrink-0">
                    Impersonated
                  </Badge>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      <Link to="/platform/orgs">
        <Button variant="secondary" fullWidth rightIcon={ChevronRight}>
          All organisations
        </Button>
      </Link>
    </div>
  );
}
