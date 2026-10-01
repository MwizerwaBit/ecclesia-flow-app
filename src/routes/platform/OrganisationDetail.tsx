/**
 * @file OrganisationDetail.tsx
 * @description PA-04 — everything about one church, in the order support needs it.
 *
 * Usage against tier limits comes before billing: the most common support
 * conversation is "why can't I add another member", and the answer is a bar on
 * this screen.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  Eye,
  Flag,
  HardDrive,
  Network,
  Pause,
  Users,
} from 'lucide-react';
import type { OrgTier } from '@/types';
import { platformService } from '@/services/platformService';
import { DetailLayout } from '@/components/layout';
import { Badge, BottomSheet, Button, Card, Input, Text } from '@/components/ui';
import { formatDate, formatNumber, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/cn';

/** Tier ceilings, used to draw the usage bars. */
const TIER_LIMITS: Record<OrgTier, { members: number; units: number; storageMb: number }> = {
  free: { members: 50, units: 1, storageMb: 500 },
  seed: { members: 250, units: 3, storageMb: 2000 },
  parish: { members: 2000, units: 10, storageMb: 10000 },
  growth: { members: 5000, units: 50, storageMb: 50000 },
  diocese: { members: 25000, units: 500, storageMb: 250000 },
  enterprise: { members: 100000, units: 5000, storageMb: 1000000 },
};

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
  icon: typeof Users;
}

function UsageBar({ label, used, limit, format = formatNumber, icon: Icon }: UsageBarProps) {
  const ratio = limit > 0 ? used / limit : 0;
  const isNearLimit = ratio > 0.85;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={15} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body-sm" className="truncate">
            {label}
          </Text>
        </div>
        <Text
          variant="caption"
          className={cn('tabular-nums shrink-0', isNearLimit ? 'text-warning font-medium' : 'text-slate-500')}
        >
          {format(used)} / {format(limit)}
        </Text>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-slow',
            isNearLimit ? 'bg-warning' : 'bg-primary',
          )}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function OrganisationDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [isSuspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { data: org, isLoading } = useQuery({
    queryKey: ['platform', 'org', id],
    queryFn: () => platformService.getOrg(id),
    enabled: Boolean(id),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['platform', 'audit-log', id],
    queryFn: () => platformService.listAuditLog({ orgId: id }),
    enabled: Boolean(id),
  });

  const suspend = useMutation({
    mutationFn: () => platformService.setOrgStatus(id, 'suspended', reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'org', id] });
      setSuspendOpen(false);
    },
  });

  if (isLoading || !org) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading organisation…
      </Text>
    );
  }

  const limits = TIER_LIMITS[org.tier];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6 animate-fade-in">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <Text variant="h1" className="min-w-0">
            {org.displayName}
          </Text>
          <Badge
            variant={
              org.status === 'active'
                ? 'success'
                : org.status === 'trial'
                  ? 'info'
                  : org.status === 'suspended'
                    ? 'warning'
                    : 'danger'
            }
            dot
            className="shrink-0"
          >
            {org.status}
          </Badge>
        </div>
        <Text variant="body" color="muted">
          {org.slug} · {org.country} · {org.tier} tier
        </Text>
        <Text variant="caption" color="muted" className="block mt-1">
          Created {formatDate(org.createdAt)}
          {org.lastActiveAt ? ` · last active ${formatRelative(org.lastActiveAt)}` : ''}
        </Text>
      </header>

      <DetailLayout
        main={
          <>
      <div>
        <Text variant="h2" className="mb-3">
          Usage
        </Text>
        <Card padding="md" className="space-y-4">
          <UsageBar label="Members" used={org.memberCount} limit={limits.members} icon={Users} />
          <UsageBar label="Units" used={6} limit={limits.units} icon={Network} />
          <UsageBar
            label="Storage"
            used={412}
            limit={limits.storageMb}
            format={(n) => `${(n / 1024).toFixed(1)} GB`}
            icon={HardDrive}
          />
        </Card>
      </div>

      {/* Subscription */}
      <div>
        <Text variant="h2" className="mb-3">
          Subscription
        </Text>
        <Card padding="md" className="space-y-2.5">
          <div className="flex justify-between gap-3">
            <Text variant="body-sm" color="muted">
              Tier
            </Text>
            <Text variant="body-sm" className="font-medium capitalize">
              {org.tier}
            </Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text variant="body-sm" color="muted">
              {org.trialEndsAt ? 'Trial ends' : 'Renews'}
            </Text>
            <Text variant="body-sm" className="font-medium">
              {formatDate(org.trialEndsAt ?? org.renewalDate ?? org.createdAt)}
            </Text>
          </div>
          <Link to={`/platform/orgs/${id}/billing`}>
            <Button variant="secondary" size="sm" fullWidth className="mt-2" leftIcon={CreditCard}>
              Manage subscription
            </Button>
          </Link>
        </Card>
      </div>

          </>
        }
        aside={
          <>
      <div>
        <Text variant="h2" className="mb-3">
          Support
        </Text>
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/platform/impersonate?orgId=${id}`}>
            <Button variant="secondary" fullWidth leftIcon={Eye}>
              Impersonate
            </Button>
          </Link>
          <Link to={`/platform/orgs/${id}/flags`}>
            <Button variant="secondary" fullWidth leftIcon={Flag}>
              Feature flags
            </Button>
          </Link>
        </div>
      </div>

      {/* Audit */}
      <div>
        <Text variant="h2" className="mb-3">
          Recent activity
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {auditLog.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Text variant="body-sm" color="muted">
                Nothing recorded for this organisation yet.
              </Text>
            </div>
          ) : (
            auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <Activity size={15} className="text-slate-300 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Text variant="body-sm" className="truncate">
                    {entry.userName} · {entry.action}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatRelative(entry.createdAt)}
                  </Text>
                </div>
                {entry.isImpersonated && (
                  <Badge variant="warning" size="sm" className="shrink-0">
                    Impersonated
                  </Badge>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

          </>
        }
      />

      {org.status === 'active' && (
        <Button variant="ghost" fullWidth leftIcon={Pause} className="mt-5" onClick={() => setSuspendOpen(true)}>
          Suspend this organisation
        </Button>
      )}

      {isSuspendOpen && (
        <BottomSheet
          open
          onClose={() => setSuspendOpen(false)}
          title="Suspend organisation"
          description="Everyone at this church is signed out and locked out until it is reinstated. Their data is untouched."
          footer={
            <Button
              variant="destructive"
              size="lg"
              fullWidth
              disabled={reason.trim().length === 0}
              isLoading={suspend.isPending}
              onClick={() => suspend.mutate()}
            >
              Suspend {org.displayName}
            </Button>
          }
        >
          <Input
            label="Reason"
            autoFocus
            placeholder="Payment failed after three attempts"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Text variant="caption" color="muted" className="block mt-3">
            Recorded in the platform audit log against your name.
          </Text>
        </BottomSheet>
      )}
    </div>
  );
}
