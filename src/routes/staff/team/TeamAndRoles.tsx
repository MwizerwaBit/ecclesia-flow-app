/**
 * @file TeamAndRoles.tsx
 * @description Who has an admin account, what they can do, and how well protected it is.
 *
 * MFA status is shown per person rather than buried in security settings: an
 * account with finance access and no second factor is the risk a church admin
 * most needs to see, and they will only see it if it is on this list.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { Clock, Crown, Plus, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import type { TeamMember } from '@/types';
import { teamService } from '@/services/teamService';
import { useRole } from '@/hooks/useRole';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { EditRoleAssignmentSheet } from './EditRoleAssignmentSheet';
import { formatRelative } from '@/lib/formatters';

type Tab = 'people' | 'roles';

export function TeamAndRoles() {
  const { can } = useRole();
  const [tab, setTab] = useState<Tab>('people');
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const { data: leader } = useQuery({
    queryKey: ['team', 'leader'],
    queryFn: () => teamService.getLeader(),
  });

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.listTeam(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => teamService.listRoles(),
  });

  const withoutMfa = team.filter((m) => !m.mfaEnabled && m.acceptedAt);

  if (!can('team:read')) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Team &amp; roles
        </Text>
        <Text variant="body" color="muted">
          The people who can sign in and administer your church.
        </Text>
      </header>

      {leader && (
        <Card variant="outline" padding="md" className="mb-5 flex items-center gap-3">
          <Avatar src={leader.photoUrl} name={`${leader.firstName} ${leader.lastName}`} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Crown size={14} className="text-amber-500 shrink-0" aria-hidden />
              <Text variant="label" color="muted">
                Church leader
              </Text>
            </div>
            <Text variant="body" className="font-medium truncate">
              {leader.firstName} {leader.lastName}
            </Text>
          </div>
          {can('org:settings') && (
            <Link to="/staff/team/leadership">
              <Button variant="secondary" size="sm">
                Manage
              </Button>
            </Link>
          )}
        </Card>
      )}

      <SegmentedControl
        label="Team view"
        value={tab}
        onChange={setTab}
        className="mb-5"
        options={[
          { value: 'people', label: `People (${team.length})` },
          { value: 'roles', label: `Roles (${roles.length})` },
        ]}
      />

      {tab === 'people' && (
        <>
          {/* Security nudge, shown only when it is actionable */}
          {withoutMfa.length > 0 && (
            <Card variant="outline" padding="md" className="mb-4 border-warning/40 bg-warning-light/40">
              <div className="flex items-start gap-3">
                <ShieldAlert size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
                <div>
                  <Text variant="h3" className="mb-0.5">
                    {withoutMfa.length} without two-factor
                  </Text>
                  <Text variant="body-sm" color="muted">
                    {withoutMfa.map((m) => m.firstName).join(', ')} can sign in with a password
                    alone.
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

          <div className="grid gap-2.5 xl:grid-cols-2">
            {team.map((member) => {
              const isPending = !member.acceptedAt;

              return (
                <Card key={member.id} padding="none" variant="elevated">
                  <button
                    type="button"
                    onClick={() => setEditing(member)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <Avatar
                      src={member.photoUrl}
                      name={`${member.firstName} ${member.lastName}`}
                      size="md"
                      className="shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {member.firstName} {member.lastName}
                        {member.isLeader && <Crown size={14} className="text-amber-500 shrink-0" aria-label="Church leader" />}
                      </p>
                      <Text variant="caption" color="muted" className="truncate block">
                        {member.email}
                      </Text>
                      <Text variant="caption" color="muted" className="block mt-0.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <Clock size={12} aria-hidden /> Invitation pending
                          </span>
                        ) : member.lastActiveAt ? (
                          `Active ${formatRelative(member.lastActiveAt)}`
                        ) : (
                          'Never signed in'
                        )}
                      </Text>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className="rounded-full px-2.5 py-1 text-caption font-medium text-white"
                        style={{ backgroundColor: member.roleColor ?? '#4338CA' }}
                      >
                        {member.roleName}
                      </span>
                      {member.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-caption text-success">
                          <ShieldCheck size={13} aria-hidden /> 2FA
                        </span>
                      ) : (
                        !isPending && (
                          <span className="inline-flex items-center gap-1 text-caption text-warning">
                            <ShieldAlert size={13} aria-hidden /> No 2FA
                          </span>
                        )
                      )}
                    </div>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                    <Text variant="caption" color="muted">
                      Scope: {member.unitScopeName ?? 'All units'}
                    </Text>
                  </div>
                </Card>
              );
            })}
          </div>

          <Link to="/staff/team/invite">
            <Button variant="primary" fullWidth leftIcon={UserPlus} className="mt-6">
              Invite someone
            </Button>
          </Link>
        </>
      )}

      {tab === 'roles' && (
        <>
          {roles.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No roles yet"
              description="Roles decide what each person on your team can see and do."
            />
          )}

          <div className="space-y-2.5">
            {roles.map((role) => (
              <Card key={role.id} padding="md" variant="elevated">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: role.color ?? '#4338CA' }}
                      aria-hidden
                    />
                    <Text variant="h3" className="truncate">
                      {role.name}
                    </Text>
                  </div>
                  {role.isSystem && (
                    <Badge variant="neutral" size="sm" className="shrink-0">
                      Built in
                    </Badge>
                  )}
                </div>

                <Text variant="body-sm" color="muted">
                  {role.permissions.length} permissions · {role.memberCount}{' '}
                  {role.memberCount === 1 ? 'person' : 'people'}
                </Text>
              </Card>
            ))}
          </div>

          <Link to="/staff/team/roles/new">
            <Button variant="primary" fullWidth leftIcon={Plus} className="mt-6">
              Build a custom role
            </Button>
          </Link>
        </>
      )}

      {editing && (
        <EditRoleAssignmentSheet
          member={editing}
          roles={roles}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
