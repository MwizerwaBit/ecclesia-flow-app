/**
 * @file PlatformAdminUsers.tsx
 * @description PA-14 — the platform team itself.
 *
 * Two levels: PLATFORM_ADMIN can change subscriptions and flags, PLATFORM_SUPPORT
 * can look and impersonate but not alter commercial state. MFA is mandatory here
 * rather than advised, so an admin without it is shown as a defect to fix.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Mail, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { Avatar, Badge, BottomSheet, Button, Card, EmptyState, Input, Select, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

const LEVELS = [
  {
    value: 'PLATFORM_SUPPORT',
    label: 'Support — view and impersonate',
    detail: 'Cannot change subscriptions or feature flags.',
  },
  {
    value: 'PLATFORM_ADMIN',
    label: 'Admin — full access',
    detail: 'Can change commercial state for any organisation.',
  },
];

export function PlatformAdminUsers() {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('PLATFORM_SUPPORT');

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['platform', 'admins'],
    queryFn: () => platformService.listPlatformAdmins(),
  });

  const withoutMfa = admins.filter((a) => !a.mfaEnabled);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Platform team
        </Text>
        <Text variant="body" color="muted">
          {admins.length} people with cross-tenant access.
        </Text>
      </header>

      {/* MFA is required here, so a gap is a defect */}
      {withoutMfa.length > 0 && (
        <Card variant="outline" padding="md" className="mb-4 border-danger/40 bg-danger-light/30">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-danger shrink-0 mt-0.5" aria-hidden />
            <div>
              <Text variant="h3" className="mb-0.5">
                {withoutMfa.length} without mandatory two-factor
              </Text>
              <Text variant="body-sm" color="muted">
                {withoutMfa.map((a) => a.name).join(', ')} can reach every tenant&rsquo;s data with a
                password alone. Revoke until they enrol.
              </Text>
            </div>
          </div>
        </Card>
      )}

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading the team…
        </Text>
      )}

      {!isLoading && admins.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="No platform admins yet"
          description="Invite the first person who needs cross-tenant access."
          action={
            <Button variant="primary" leftIcon={UserPlus} onClick={() => setInviteOpen(true)}>
              Invite a platform admin
            </Button>
          }
        />
      )}

      <div className="space-y-2.5">
        {admins.map((admin) => (
          <Card key={admin.id} padding="md" variant="elevated">
            <div className="flex items-center gap-3">
              <Avatar name={admin.name} size="md" className="shrink-0" />

              <div className="min-w-0 flex-1">
                <Text variant="h3" className="truncate">
                  {admin.name}
                </Text>
                <Text variant="caption" color="muted" className="truncate block">
                  {admin.email}
                </Text>
                <Text variant="caption" color="muted" className="block mt-0.5">
                  Last in {formatRelative(admin.lastLoginAt)}
                </Text>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge
                  variant={admin.level === 'PLATFORM_ADMIN' ? 'platform' : 'neutral'}
                  size="sm"
                >
                  {admin.level === 'PLATFORM_ADMIN' ? 'Admin' : 'Support'}
                </Badge>
                {admin.mfaEnabled ? (
                  <span className="inline-flex items-center gap-1 text-caption text-success">
                    <ShieldCheck size={13} aria-hidden /> 2FA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-caption text-danger">
                    <ShieldAlert size={13} aria-hidden /> No 2FA
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-caption text-slate-500">
                <Eye size={13} aria-hidden />
                {admin.impersonationCount} impersonation
                {admin.impersonationCount === 1 ? '' : 's'}
              </span>
              <Button variant="ghost" size="sm">
                Revoke access
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button
        variant="primary"
        fullWidth
        leftIcon={UserPlus}
        className="mt-6"
        onClick={() => setInviteOpen(true)}
      >
        Invite a platform admin
      </Button>

      {isInviteOpen && (
        <BottomSheet
          open
          onClose={() => setInviteOpen(false)}
          title="Invite a platform admin"
          description="They must verify their email and enrol in two-factor before their first sign-in."
          footer={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Mail}
              disabled={!/.+@.+\..+/.test(email.trim())}
              onClick={() => setInviteOpen(false)}
            >
              Send invitation
            </Button>
          }
        >
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoFocus
              placeholder="name@ecclesiaflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Access level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              options={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
            />
            <Text variant="caption" color="muted">
              {LEVELS.find((l) => l.value === level)?.detail}
            </Text>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
