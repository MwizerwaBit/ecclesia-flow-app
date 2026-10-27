/**
 * @file GroupRoles.tsx
 * @description The capability templates groups assign to members — Leader,
 * Assistant, Member by default, plus whatever a church adds (Secretary,
 * Treasurer…). Not the fixed per-membership rank used elsewhere; this is
 * what each of those roles is actually allowed to do.
 *
 * The built-in three can be renamed but not reshaped — every church needs
 * one role that can always run a group — which mirrors the server's own
 * rule (see groups/service.py:update_role) rather than inventing a softer
 * one here that the API would just reject.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { GroupCapability, GroupRoleDef } from '@/types';
import { groupsService } from '@/services/groupsService';
import { ApiError } from '@/services/adapter';
import { useRole } from '@/hooks/useRole';
import { Button, Card, Checkbox, Input, Text } from '@/components/ui';

const CAPABILITIES: Array<{ key: GroupCapability; label: string }> = [
  { key: 'manage_roster', label: 'Add and remove members' },
  { key: 'edit_group', label: "Edit the group's details" },
  { key: 'message', label: 'Message the whole group' },
  { key: 'manage_events', label: "Create the group's gatherings" },
];

function RoleCard({ role }: { role: GroupRoleDef }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(role.name);
  const [capabilities, setCapabilities] = useState<Set<GroupCapability>>(new Set(role.capabilities));
  const [rank, setRank] = useState(role.rank);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== role.name || rank !== role.rank || capabilities.size !== role.capabilities.length ||
    role.capabilities.some((c) => !capabilities.has(c));

  const save = useMutation({
    mutationFn: () => groupsService.updateRole(role.id, { name: name.trim(), capabilities: [...capabilities], rank }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', 'roles'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save that role'),
  });

  const remove = useMutation({
    mutationFn: () => groupsService.deleteRole(role.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', 'roles'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not delete that role'),
  });

  function toggle(key: GroupCapability) {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-start gap-2">
        <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        {!role.isSystem && (
          <Input
            label="Rank"
            type="number"
            value={rank}
            onChange={(e) => setRank(Number(e.target.value))}
            className="w-24"
          />
        )}
        {role.isSystem && (
          <div className="flex items-center gap-1 text-slate-400 pt-7" title="Built-in role — powers are fixed">
            <Lock size={14} aria-hidden />
            <Text variant="caption">Built-in</Text>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {CAPABILITIES.map((cap) => (
          <Checkbox
            key={cap.key}
            label={cap.label}
            checked={capabilities.has(cap.key)}
            disabled={role.isSystem}
            onChange={() => toggle(cap.key)}
          />
        ))}
      </div>

      {error && (
        <Text variant="body-sm" className="text-danger">
          {error}
        </Text>
      )}

      <div className="flex items-center justify-between gap-2">
        {!role.isSystem ? (
          <Button variant="ghost" size="sm" leftIcon={Trash2} isLoading={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={!dirty || name.trim().length === 0}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

function NewRoleForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [capabilities, setCapabilities] = useState<Set<GroupCapability>>(new Set());
  const [rank, setRank] = useState(50);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => groupsService.createRole({ name: name.trim(), capabilities: [...capabilities], rank }),
    onSuccess: () => {
      setName('');
      setCapabilities(new Set());
      onCreated();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create that role'),
  });

  function toggle(key: GroupCapability) {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Card variant="outline" padding="md" className="space-y-3">
      <Text variant="label" color="muted">
        Add a role
      </Text>
      <div className="flex items-start gap-2">
        <Input label="Role name" placeholder="Secretary" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Input label="Rank" type="number" value={rank} onChange={(e) => setRank(Number(e.target.value))} className="w-24" />
      </div>
      <div className="space-y-1.5">
        {CAPABILITIES.map((cap) => (
          <Checkbox key={cap.key} label={cap.label} checked={capabilities.has(cap.key)} onChange={() => toggle(cap.key)} />
        ))}
      </div>
      {error && (
        <Text variant="body-sm" className="text-danger">
          {error}
        </Text>
      )}
      <Button
        variant="primary"
        size="sm"
        leftIcon={Plus}
        disabled={name.trim().length === 0}
        isLoading={create.isPending}
        onClick={() => create.mutate()}
      >
        Add role
      </Button>
    </Card>
  );
}

export function GroupRoles() {
  const { can } = useRole();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['groups', 'roles'],
    queryFn: () => groupsService.listRoles(),
  });

  if (!can('groups:read')) {
    return <Navigate to="/403" replace />;
  }

  const canManage = can('groups:manage');
  const sorted = [...roles].sort((a, b) => a.rank - b.rank);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Group roles
        </Text>
        <Text variant="body" color="muted">
          What each role can do inside any group — assigned per member on that group's roster.
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading roles…
        </Text>
      )}

      <div className="space-y-3">
        {sorted.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      {canManage && <NewRoleForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['groups', 'roles'] })} />}
    </div>
  );
}
