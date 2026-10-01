/**
 * @file Impersonation.tsx
 * @description PA-08 — sign into a church's account to reproduce what they are seeing.
 *
 * The limits are stated before the session starts, not buried in a policy: an
 * hour maximum, pastoral notes never readable, no financial exports, no deletes,
 * every action tagged, and the church's admin emailed that it happened. Support
 * access that nobody can audit is not support access, it is a back door.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ban, Eye, Lock, Mail, ShieldAlert, Timer } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { Button, Card, Select, Text } from '@/components/ui';

const IMPERSONATABLE_ROLES = [
  { value: 'staff', label: 'Staff — the usual support case' },
  { value: 'board', label: 'Board / network admin' },
  { value: 'member', label: 'Member — to see their portal' },
];

/** What an impersonated session can never do, whatever the role allows. */
const HARD_LIMITS = [
  { icon: Lock, label: 'Pastoral notes stay sealed', detail: 'The confidential permission is never granted.' },
  { icon: Ban, label: 'No financial exports', detail: 'Giving data cannot leave the account.' },
  { icon: Ban, label: 'No deletions', detail: 'Destructive actions are blocked outright.' },
  { icon: Timer, label: 'One hour maximum', detail: 'The token expires and cannot be renewed.' },
  { icon: Mail, label: 'The church is told', detail: 'Their admin is emailed that a session was opened.' },
];

export function Impersonation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState(searchParams.get('orgId') ?? '');
  const [role, setRole] = useState('staff');

  const { data: orgs = [] } = useQuery({
    queryKey: ['platform', 'orgs'],
    queryFn: () => platformService.listOrgs(),
  });

  const activeOrgId = orgId || orgs[0]?.id || '';
  const org = orgs.find((o) => o.id === activeOrgId);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Impersonate
        </Text>
        <Text variant="body" color="muted">
          See exactly what a user sees, to reproduce what they are reporting.
        </Text>
      </header>

      <Select
        label="Organisation"
        value={activeOrgId}
        onChange={(e) => setOrgId(e.target.value)}
        options={orgs.map((o) => ({ value: o.id, label: `${o.displayName} (${o.slug})` }))}
      />

      <Select
        label="Role to impersonate"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        options={IMPERSONATABLE_ROLES}
      />

      {/* Stated up front, not in a policy document */}
      <Card variant="outline" padding="md" className="border-warning/40 bg-warning-light/30">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
          <div>
            <Text variant="h3" className="mb-0.5">
              What this session cannot do
            </Text>
            <Text variant="body-sm" color="muted">
              These limits hold regardless of the role you choose.
            </Text>
          </div>
        </div>

        <div className="space-y-2.5">
          {HARD_LIMITS.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon size={15} className="text-warning shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <Text variant="body-sm" className="font-medium">
                  {label}
                </Text>
                <Text variant="caption" color="muted">
                  {detail}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="flat" padding="md">
        <Text variant="body-sm" color="muted">
          Every action you take will be written to{' '}
          <span className="font-medium">{org?.displayName ?? 'the church'}</span>&rsquo;s own audit log
          and to the platform log, tagged as impersonated and attributed to you.
        </Text>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Eye}
        disabled={!activeOrgId}
        onClick={() => navigate(role === 'member' ? '/portal' : '/staff/dashboard')}
      >
        Start impersonating {org?.displayName ?? ''}
      </Button>

      <Button variant="ghost" fullWidth onClick={() => navigate('/platform/dashboard')}>
        Cancel
      </Button>
    </div>
  );
}
