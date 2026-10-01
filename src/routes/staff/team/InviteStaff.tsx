/**
 * @file InviteStaff.tsx
 * @description Invite someone onto the team, with what they'll be able to do spelled out.
 *
 * The permission preview is the point. Handing someone "Treasurer" means nothing
 * to a church admin until they can see it includes reading every member's giving
 * history — so the grant is described before the invitation is sent, not after.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, Mail, Send, ShieldAlert } from 'lucide-react';
import { teamService } from '@/services/teamService';
import { commsService } from '@/services/commsService';
import { PERMISSION_CATALOGUE } from '@/mocks/comms.mock';
import { Button, Card, Input, Select, Text } from '@/components/ui';

export function InviteStaff() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [unitScope, setUnitScope] = useState('all');
  const [message, setMessage] = useState('');

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => teamService.listRoles(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  // Until a role is chosen, stand on the least-privileged one rather than the first.
  const activeRoleId =
    roleId || [...roles].sort((a, b) => a.permissions.length - b.permissions.length)[0]?.id || '';
  const selectedRole = roles.find((r) => r.id === activeRoleId);

  /** The chosen role's permissions, regrouped by module for the preview. */
  const grantedByModule = PERMISSION_CATALOGUE.map((group) => ({
    module: group.module,
    granted: group.permissions.filter((p) => selectedRole?.permissions.includes(p.key)),
  })).filter((group) => group.granted.length > 0);

  const sensitiveGrants = grantedByModule
    .flatMap((g) => g.granted)
    .filter((p) => p.sensitive);

  const invite = useMutation({
    mutationFn: () =>
      teamService.invite({
        email: email.trim(),
        roleId: activeRoleId,
        unitScope,
        message: message.trim() || undefined,
      }),
    onSuccess: () => navigate('/staff/team'),
  });

  const canInvite = /.+@.+\..+/.test(email.trim()) && Boolean(activeRoleId);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Invite to the team
        </Text>
        <Text variant="body" color="muted">
          They&rsquo;ll get an email with a link to set their own password.
        </Text>
      </header>

      <Input
        label="Email address"
        type="email"
        autoFocus
        autoComplete="email"
        leftIcon={Mail}
        placeholder="name@yourchurch.org"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Select
        label="Role"
        value={activeRoleId}
        onChange={(e) => setRoleId(e.target.value)}
        options={roles.map((r) => ({
          value: r.id,
          label: `${r.name} — ${r.permissions.length} permissions`,
        }))}
      />

      <Select
        label="Unit scope"
        value={unitScope}
        onChange={(e) => setUnitScope(e.target.value)}
        options={[
          { value: 'all', label: 'All units' },
          ...units.map((u) => ({ value: u.id, label: u.name })),
        ]}
      />

      {/* What they'll be able to do */}
      {selectedRole && (
        <Card variant="outline" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={18} className="text-primary" aria-hidden />
            <Text variant="label" color="muted">
              What they&rsquo;ll be able to do
            </Text>
          </div>

          <div className="space-y-3">
            {grantedByModule.map((group) => (
              <div key={group.module}>
                <Text variant="body-sm" className="font-medium mb-1">
                  {group.module}
                </Text>
                <ul className="space-y-0.5">
                  {group.granted.map((permission) => (
                    <li key={permission.key} className="flex items-start gap-2">
                      <Check size={14} className="text-success shrink-0 mt-1" aria-hidden />
                      <Text variant="body-sm" color="muted">
                        {permission.label}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {sensitiveGrants.length > 0 && (
            <div className="flex items-start gap-2 mt-4 rounded-lg bg-warning-light px-3 py-2.5">
              <ShieldAlert size={16} className="text-warning shrink-0 mt-0.5" aria-hidden />
              <Text variant="caption" className="text-warning">
                {sensitiveGrants.length} of these are sensitive — including{' '}
                {sensitiveGrants
                  .slice(0, 2)
                  .map((p) => p.label.toLowerCase())
                  .join(' and ')}
                .
              </Text>
            </div>
          )}

          <Text variant="caption" color="muted" className="block mt-3">
            Scoped to{' '}
            {unitScope === 'all'
              ? 'every unit in your church'
              : (units.find((u) => u.id === unitScope)?.name ?? 'one unit')}
            .
          </Text>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-message" className="text-label text-slate-700 dark:text-slate-300">
          Personal note
        </label>
        <textarea
          id="invite-message"
          rows={3}
          placeholder="Optional — a line so they know who is asking."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Send}
        disabled={!canInvite}
        isLoading={invite.isPending}
        onClick={() => invite.mutate()}
      >
        Send invitation
      </Button>

      <Button variant="ghost" fullWidth onClick={() => navigate('/staff/team')}>
        Cancel
      </Button>
    </div>
  );
}
