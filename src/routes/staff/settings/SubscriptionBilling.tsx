/**
 * @file SubscriptionBilling.tsx
 * @description The church's own view of its plan, usage and invoices.
 *
 * Usage against limits leads, because the moment this screen matters is when a
 * church is about to outgrow its tier — and finding that out by being blocked
 * from adding a member is the wrong way to learn it.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CreditCard, Download, HardDrive, Network, Users } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { commsService } from '@/services/commsService';
import { Badge, Button, Card, Text } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

const PLAN = {
  tier: 'Parish',
  monthly: 49,
  cycle: 'monthly' as const,
  renewsOn: '2025-01-10',
  limits: { members: 2000, units: 10, storageMb: 10000 },
};

const INVOICES = [
  { id: 'in1', date: '2024-10-01', amount: 49, status: 'paid' as const },
  { id: 'in2', date: '2024-09-01', amount: 49, status: 'paid' as const },
  { id: 'in3', date: '2024-08-01', amount: 49, status: 'paid' as const },
];

interface UsageRowProps {
  icon: typeof Users;
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
}

function UsageRow({ icon: Icon, label, used, limit, format = String }: UsageRowProps) {
  const ratio = limit > 0 ? used / limit : 0;
  const isNearLimit = ratio > 0.8;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={15} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body-sm">{label}</Text>
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

export function SubscriptionBilling() {
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const isNearAnyLimit =
    members.length / PLAN.limits.members > 0.8 || units.length / PLAN.limits.units > 0.8;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Plan &amp; billing
        </Text>
        <Text variant="body" color="muted">
          What you are on, and what you are using.
        </Text>
      </header>

      {/* Current plan */}
      <Card variant="outline" padding="md">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <Text variant="label" color="muted">
              Current plan
            </Text>
            <Text variant="h2">{PLAN.tier}</Text>
          </div>
          <Badge variant="success" dot className="shrink-0">
            Active
          </Badge>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <Text variant="body-sm" color="muted">
            {formatCurrency(PLAN.monthly)} per month
          </Text>
          <Text variant="body-sm" color="muted">
            Renews {formatDate(PLAN.renewsOn)}
          </Text>
        </div>
      </Card>

      {/* Usage */}
      <div>
        <Text variant="h2" className="mb-3">
          Usage
        </Text>
        <Card padding="md" className="space-y-4">
          <UsageRow icon={Users} label="Members" used={members.length} limit={PLAN.limits.members} />
          <UsageRow icon={Network} label="Units" used={units.length} limit={PLAN.limits.units} />
          <UsageRow
            icon={HardDrive}
            label="Storage"
            used={412}
            limit={PLAN.limits.storageMb}
            format={(n) => `${(n / 1024).toFixed(1)} GB`}
          />
        </Card>

        {isNearAnyLimit && (
          <Card variant="outline" padding="md" className="mt-3 border-warning/40 bg-warning-light/40">
            <Text variant="body-sm" className="mb-3">
              You are approaching a limit on your plan. Upgrading now avoids being blocked partway
              through adding people.
            </Text>
            <Link to="/pricing">
              <Button variant="secondary" size="sm" rightIcon={ArrowUpRight}>
                See larger plans
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Payment */}
      <div>
        <Text variant="h2" className="mb-3">
          Payment method
        </Text>
        <Card padding="md" className="flex items-center gap-3">
          <CreditCard size={20} className="text-slate-400 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <Text variant="body">Card ending 4242</Text>
            <Text variant="caption" color="muted">
              Expires 08/2027
            </Text>
          </div>
          <Button variant="ghost" size="sm">
            Change
          </Button>
        </Card>
      </div>

      {/* Invoices */}
      <div>
        <Text variant="h2" className="mb-3">
          Invoices
        </Text>
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {INVOICES.map((invoice) => (
            <div key={invoice.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Text variant="body-sm">{formatDate(invoice.date)}</Text>
              </div>
              <Text variant="body-sm" className="tabular-nums font-medium shrink-0">
                {formatCurrency(invoice.amount)}
              </Text>
              <Button variant="ghost" size="sm" leftIcon={Download} aria-label="Download invoice">
                PDF
              </Button>
            </div>
          ))}
        </Card>
      </div>

      <Link to="/pricing">
        <Button variant="primary" fullWidth rightIcon={ArrowUpRight}>
          Change plan
        </Button>
      </Link>
    </div>
  );
}
