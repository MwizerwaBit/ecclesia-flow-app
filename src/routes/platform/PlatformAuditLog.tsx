/**
 * @file PlatformAuditLog.tsx
 * @description PA-10 — every action by every user across every organisation.
 *
 * Critical events are highlighted rather than filtered to, so they are still
 * visible in context: an export immediately after an impersonation session
 * started tells a story that neither line tells alone.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Search, ShieldAlert } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { CRITICAL_ACTIONS } from '@/mocks/platform.mock';
import { downloadCsv } from '@/lib/download';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function PlatformAuditLog() {
  const [search, setSearch] = useState('');
  const [criticalOnly, setCriticalOnly] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['platform', 'audit-log'],
    queryFn: () => platformService.listAuditLog(),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => (criticalOnly ? CRITICAL_ACTIONS.includes(e.action) : true))
      .filter((e) =>
        q
          ? e.action.toLowerCase().includes(q) ||
            e.userName.toLowerCase().includes(q) ||
            (e.orgName ?? '').toLowerCase().includes(q) ||
            (e.ipAddress ?? '').includes(q)
          : true,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, search, criticalOnly]);

  const criticalCount = entries.filter((e) => CRITICAL_ACTIONS.includes(e.action)).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Audit log
        </Text>
        <Text variant="body" color="muted">
          {entries.length} entries · {criticalCount} critical
        </Text>
      </header>

      <Input
        type="search"
        placeholder="Search by action, user, organisation or IP"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={Search}
        className="mb-3"
      />

      <Checkbox
        label="Critical events only"
        checked={criticalOnly}
        onChange={(e) => setCriticalOnly(e.target.checked)}
        className="mb-5"
      />

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading the log…
        </Text>
      )}

      {!isLoading && visible.length === 0 && (
        <EmptyState
          icon={Search}
          title="Nothing matches"
          description="Try a different action, user or organisation."
        />
      )}

      <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((entry) => {
          const isCritical = CRITICAL_ACTIONS.includes(entry.action);

          return (
            <div
              key={entry.id}
              className={cn('px-4 py-3.5', isCritical && 'bg-warning-light/30 dark:bg-warning/5')}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-start gap-2 min-w-0">
                  {isCritical && (
                    <ShieldAlert
                      size={15}
                      className="text-warning shrink-0 mt-0.5"
                      aria-label="Critical event"
                    />
                  )}
                  <code className="text-body-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {entry.action}
                  </code>
                </div>
                {entry.isImpersonated && (
                  <Badge variant="warning" size="sm" className="shrink-0">
                    Impersonated
                  </Badge>
                )}
              </div>

              <Text variant="caption" color="muted" className="block">
                {entry.userName}
                {entry.orgId ? (
                  <>
                    {' · '}
                    <Link
                      to={`/platform/orgs/${entry.orgId}`}
                      className="text-primary hover:underline"
                    >
                      {entry.orgName}
                    </Link>
                  </>
                ) : null}
              </Text>

              <Text variant="caption" color="muted" className="block mt-0.5">
                {formatDateTime(entry.createdAt)}
                {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
                {entry.metadata
                  ? ` · ${Object.entries(entry.metadata)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(', ')}`
                  : ''}
              </Text>
            </div>
          );
        })}
      </Card>

      <Button
        variant="secondary"
        fullWidth
        leftIcon={Download}
        className="mt-5"
        disabled={visible.length === 0}
        onClick={() =>
          downloadCsv(
            'platform-audit-log',
            [
              ['Timestamp', (e) => e.createdAt],
              ['Action', (e) => e.action],
              ['User', (e) => e.userName],
              ['Organisation', (e) => e.orgName ?? ''],
              ['Resource', (e) => e.resourceType],
              ['IP', (e) => e.ipAddress ?? ''],
              ['Impersonated', (e) => (e.isImpersonated ? 'yes' : 'no')],
              ['Metadata', (e) => (e.metadata ? JSON.stringify(e.metadata) : '')],
            ],
            visible,
          )
        }
      >
        Export {visible.length} entries to CSV
      </Button>
    </div>
  );
}
