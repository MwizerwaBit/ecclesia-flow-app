/**
 * @file DomainManagement.tsx
 * @description Custom domains: their status, and the DNS records to fix them.
 *
 * A domain that will not verify is almost always a DNS record the church's IT
 * contact has not added, so the records are shown right on the failing row,
 * copyable, rather than buried in documentation.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Globe, RefreshCw, ShieldCheck } from 'lucide-react';
import type { CustomDomain, DomainStatus } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

const STATUS_META: Record<
  DomainStatus,
  { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }
> = {
  active: { variant: 'success', label: 'Live' },
  pending_verification: { variant: 'warning', label: 'Awaiting DNS' },
  failed: { variant: 'danger', label: 'Failed' },
  suspended: { variant: 'neutral', label: 'Suspended' },
};

/** The records a church's IT contact has to add. */
function dnsRecords(domain: string) {
  const [host] = domain.split('.');
  return [
    { type: 'CNAME', name: host, value: 'proxy.ecclesiaflow.com' },
    { type: 'TXT', name: `_ecclesiaflow.${host}`, value: 'ef-verify=7c1a9e4b' },
  ];
}

function DomainRow({ domain }: { domain: CustomDomain }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const meta = STATUS_META[domain.status];
  const needsDns = domain.status === 'pending_verification' || domain.status === 'failed';

  const verify = useMutation({
    mutationFn: () => platformService.verifyDomain(domain.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });

  function copy(value: string) {
    void navigator.clipboard?.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <Card padding="md" variant="elevated">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <Text variant="h3" className="truncate">
            {domain.domain}
          </Text>
          <Text variant="caption" color="muted">
            {domain.orgName}
            {domain.verifiedAt ? ` · verified ${formatDate(domain.verifiedAt)}` : ''}
          </Text>
        </div>
        <Badge variant={meta.variant} dot className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <ShieldCheck
          size={14}
          className={domain.sslProvisioned ? 'text-success' : 'text-slate-300'}
          aria-hidden
        />
        <Text variant="caption" color="muted">
          {domain.sslProvisioned ? 'SSL certificate issued' : 'No certificate yet'}
        </Text>
      </div>

      {/* DNS records, right where the problem is */}
      {needsDns && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 mb-3 space-y-2">
          <Text variant="label" color="muted">
            Records to add
          </Text>
          {dnsRecords(domain.domain).map((record) => (
            <div key={record.name} className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-caption text-slate-600 dark:text-slate-300">
                {record.type} {record.name} → {record.value}
              </code>
              <button
                type="button"
                onClick={() => copy(`${record.type} ${record.name} ${record.value}`)}
                aria-label={`Copy ${record.type} record`}
                className="shrink-0 p-1.5 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copied === `${record.type} ${record.name} ${record.value}` ? (
                  <Check size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={RefreshCw}
          isLoading={verify.isPending}
          onClick={() => verify.mutate()}
        >
          {verify.isPending ? 'Checking DNS…' : 'Check now'}
        </Button>
        {domain.status === 'active' && (
          <Button variant="ghost" size="sm">
            Suspend
          </Button>
        )}
      </div>
    </Card>
  );
}

export function DomainManagement() {
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => platformService.listDomains(),
  });

  const needsAttention = domains.filter(
    (d) => d.status === 'pending_verification' || d.status === 'failed',
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Custom domains
        </Text>
        <Text variant="body" color="muted">
          {needsAttention.length > 0
            ? `${needsAttention.length} waiting on DNS changes`
            : 'Every domain is live.'}
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading domains…
        </Text>
      )}

      {!isLoading && domains.length === 0 && (
        <EmptyState
          icon={Globe}
          title="No custom domains"
          description="Diocese and Enterprise organisations can serve their portal from their own domain."
        />
      )}

      <div className="space-y-3">
        {domains.map((domain) => (
          <DomainRow key={domain.id} domain={domain} />
        ))}
      </div>
    </div>
  );
}
