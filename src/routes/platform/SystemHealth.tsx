/**
 * @file SystemHealth.tsx
 * @description PA-13 — technical monitoring for the platform team.
 *
 * Deliberately a jumping-off point rather than a replacement for real
 * observability tooling: enough to answer "is something wrong right now", with
 * links out to the tools that answer "why".
 */
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { platformService } from '@/services/platformService';
import { Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatNumber, formatPercent, formatRelative } from '@/lib/formatters';

const EXTERNAL_TOOLS = [
  { label: 'Sentry — errors', href: '#' },
  { label: 'Axiom — logs', href: '#' },
  { label: 'Checkly — uptime', href: '#' },
  { label: 'Cloud console', href: '#' },
];

export function SystemHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['platform', 'system-health'],
    queryFn: () => platformService.getSystemHealth(),
    // Health is the one screen where stale data is actively misleading.
    refetchInterval: 30_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () => platformService.getMetrics(),
  });

  if (isLoading || !health) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Checking services…
      </Text>
    );
  }

  const degraded = health.services.filter((s) => s.status !== 'operational');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          System health
        </Text>
        <Text variant="body" color="muted">
          {degraded.length === 0
            ? 'All services operational.'
            : `${degraded.length} service${degraded.length === 1 ? '' : 's'} degraded.`}
        </Text>
      </header>

      {/* Services */}
      <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
        {health.services.map((service) => (
          <div key={service.name} className="flex items-center gap-3 px-4 py-3.5">
            {service.status === 'operational' ? (
              <CheckCircle2 size={18} className="text-success shrink-0" aria-hidden />
            ) : (
              <AlertTriangle size={18} className="text-warning shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <Text variant="body">{service.name}</Text>
              <Text variant="caption" color="muted">
                {service.detail}
              </Text>
            </div>
            <Badge
              variant={service.status === 'operational' ? 'success' : 'warning'}
              size="sm"
              className="shrink-0"
            >
              {service.status}
            </Badge>
          </div>
        ))}
      </Card>

      {/* Latency */}
      {metrics && (
        <div>
          <Text variant="h2" className="mb-3">
            API latency · 24h
          </Text>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="p50" value={`${metrics.apiP50Ms}ms`} />
            <StatTile label="p95" value={`${metrics.apiP95Ms}ms`} />
            <StatTile label="p99" value={`${metrics.apiP99Ms}ms`} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Active sessions"
          value={formatNumber(health.activeSessions)}
          icon={Users}
        />
        <StatTile
          label="Error rate"
          value={metrics ? formatPercent(metrics.errorRate, 2) : '—'}
          icon={Activity}
        />
      </div>

      {/* Errors */}
      <div>
        <Text variant="h2" className="mb-3">
          Recent errors
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {health.recentErrors.map((error) => (
            <div key={error.id} className="px-4 py-3">
              <code className="block text-body-sm text-slate-900 dark:text-slate-100 break-words">
                {error.message}
              </code>
              <Text variant="caption" color="muted" className="block mt-1">
                {error.count}× · last {formatRelative(error.lastSeen)}
              </Text>
            </div>
          ))}
        </Card>
      </div>

      {/* Rate limits */}
      <div>
        <Text variant="h2" className="mb-3">
          Rate-limit violations
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {health.rateLimitViolations.map((violation) => (
            <div key={violation.ip} className="flex items-center gap-3 px-4 py-3">
              <ShieldAlert size={16} className="text-warning shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <code className="text-body-sm">{violation.ip}</code>
                <Text variant="caption" color="muted" className="block">
                  {violation.count} hits · last {formatRelative(violation.lastSeen)}
                </Text>
              </div>
              <Button variant="ghost" size="sm">
                Block
              </Button>
            </div>
          ))}
        </Card>
      </div>

      {/* Out to the real tools */}
      <div>
        <Text variant="h2" className="mb-3">
          Dig deeper
        </Text>
        <div className="grid grid-cols-2 gap-2">
          {EXTERNAL_TOOLS.map((tool) => (
            <Button key={tool.label} variant="secondary" rightIcon={ExternalLink}>
              {tool.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
