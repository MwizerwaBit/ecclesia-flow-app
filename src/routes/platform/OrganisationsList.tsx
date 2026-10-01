/**
 * @file OrganisationsList.tsx
 * @description PA-03 — every church on the platform, searchable and filterable.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Plus, Search } from 'lucide-react';
import type { OrgStatus } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, Button, Card, EmptyState, Input, SegmentedControl, Text } from '@/components/ui';
import { formatDate, formatNumber, formatRelative } from '@/lib/formatters';

type StatusFilter = OrgStatus | 'all';

const STATUS_BADGE: Record<
  OrgStatus,
  { variant: 'success' | 'info' | 'warning' | 'danger'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  trial: { variant: 'info', label: 'Trial' },
  suspended: { variant: 'warning', label: 'Suspended' },
  canceled: { variant: 'danger', label: 'Cancelled' },
};

export function OrganisationsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['platform', 'orgs', search, status],
    queryFn: () => platformService.listOrgs({ search: search || undefined, status }),
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Organisations
        </Text>
        <Text variant="body" color="muted">
          {orgs.length} {orgs.length === 1 ? 'organisation' : 'organisations'} shown
        </Text>
      </header>

      <Input
        type="search"
        placeholder="Search by name, slug or country code"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={Search}
        className="mb-4"
      />

      <SegmentedControl
        label="Status filter"
        value={status}
        onChange={setStatus}
        size="sm"
        className="mb-5"
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'trial', label: 'Trial' },
          { value: 'suspended', label: 'Suspended' },
        ]}
      />

      <Link to="/platform/orgs/new">
        <Button variant="primary" fullWidth leftIcon={Plus} className="mb-5">
          Register an organisation
        </Button>
      </Link>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading organisations…
        </Text>
      )}

      {!isLoading && orgs.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Nothing matches"
          description="Try a different name, slug or status."
        />
      )}

      <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
        {orgs.map((org) => {
          const badge = STATUS_BADGE[org.status];

          return (
            <Link
              key={org.id}
              to={`/platform/orgs/${org.id}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Text variant="h3" className="truncate">
                    {org.displayName}
                  </Text>
                  <Badge variant={badge.variant} size="sm" className="shrink-0">
                    {badge.label}
                  </Badge>
                </div>

                <Text variant="caption" color="muted" className="truncate block">
                  {org.slug} · {org.country} · {org.tier}
                </Text>

                <Text variant="caption" color="muted" className="block mt-0.5">
                  {formatNumber(org.memberCount)} members
                  {org.trialEndsAt
                    ? ` · trial ends ${formatDate(org.trialEndsAt)}`
                    : org.renewalDate
                      ? ` · renews ${formatDate(org.renewalDate)}`
                      : ''}
                  {org.lastActiveAt ? ` · active ${formatRelative(org.lastActiveAt)}` : ''}
                </Text>
              </div>

              <ChevronRight size={18} className="text-slate-300 shrink-0" aria-hidden />
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
