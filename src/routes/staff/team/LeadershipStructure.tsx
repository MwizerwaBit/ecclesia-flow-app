/**
 * @file LeadershipStructure.tsx
 * @description The church's named leadership tree — Senior Pastor, Associate
 * Pastor, Zone Elder and whatever else a church defines — distinct from the
 * single-leader "Leadership transfer" process (ChurchLeadership.tsx): a
 * position here can grant an RBAC role to whoever holds it, several people
 * can hold the same one, and most are honorific with no extra access at all.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Network, Plus, UserPlus, X } from 'lucide-react';
import type { LeadershipPosition, PositionNode } from '@/types';
import { leadershipService, buildPositionTree } from '@/services/leadershipService';
import { teamService } from '@/services/teamService';
import { commsService } from '@/services/commsService';
import { useRole } from '@/hooks/useRole';
import { ApiError } from '@/services/adapter';
import { Avatar, Badge, BottomSheet, Button, Card, EmptyState, Input, Select, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

function PositionSheet({
  parent,
  position,
  positions,
  onClose,
}: {
  parent: PositionNode | null;
  position?: LeadershipPosition;
  positions: LeadershipPosition[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(position?.title ?? '');
  const [description, setDescription] = useState(position?.description ?? '');
  const [roleId, setRoleId] = useState(position?.roleId ?? '');
  const [unitId, setUnitId] = useState(position?.unitId ?? '');
  const [parentId, setParentId] = useState(position?.parentId ?? parent?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => teamService.listRoles() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });

  const save = useMutation({
    mutationFn: () => {
      const input = {
        title: title.trim(),
        parentId: parentId || null,
        description: description.trim() || null,
        roleId: roleId || null,
        unitId: unitId || null,
      };
      return position ? leadershipService.update(position.id, input) : leadershipService.create(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leadership', 'positions'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save that position'),
  });

  const remove = useMutation({
    mutationFn: () => leadershipService.remove(position!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leadership', 'positions'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not remove that position'),
  });

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={position ? `Edit ${position.title}` : parent ? `New position under ${parent.title}` : 'New position'}
      description="Positions can grant a role and a branch scope to whoever holds them — most are honorific."
      footer={
        <div className="flex gap-2">
          {position && (
            <Button variant="ghost" isLoading={remove.isPending} onClick={() => remove.mutate()}>
              Remove
            </Button>
          )}
          <Button
            variant="primary"
            fullWidth
            disabled={title.trim().length === 0}
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            {position ? 'Save changes' : 'Create position'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Title" autoFocus placeholder="Associate Pastor" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Description"
          placeholder="Optional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Select
          label="Reports to"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          options={[
            { value: '', label: 'Top of the structure' },
            ...positions.filter((p) => p.id !== position?.id).map((p) => ({ value: p.id, label: p.title })),
          ]}
        />
        <Select
          label="Grants role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          options={[{ value: '', label: 'Honorific — no extra access' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
        />
        <Select
          label="Branch scope"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          options={[{ value: '', label: 'Whole church' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
        />
        {error && (
          <Text variant="body-sm" className="text-danger">
            {error}
          </Text>
        )}
      </div>
    </BottomSheet>
  );
}

function AssignSheet({ position, onClose }: { position: LeadershipPosition; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [membershipId, setMembershipId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamService.listTeam() });
  const heldIds = new Set(position.holders.map((h) => h.membershipId));
  const candidates = team.filter((t) => !heldIds.has(t.id));

  const assign = useMutation({
    mutationFn: () => leadershipService.assign(position.id, membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leadership', 'positions'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not assign that person'),
  });

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`Assign to ${position.title}`}
      footer={
        <Button variant="primary" fullWidth disabled={!membershipId} isLoading={assign.isPending} onClick={() => assign.mutate()}>
          Assign
        </Button>
      }
    >
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <Text variant="body" color="muted">
            Everyone on the team already holds this position.
          </Text>
        ) : (
          <Select
            label="Team member"
            value={membershipId}
            onChange={(e) => setMembershipId(e.target.value)}
            options={[
              { value: '', label: 'Choose someone' },
              ...candidates.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
            ]}
          />
        )}
        {position.roleId && (
          <Text variant="caption" color="muted">
            This also grants them the {position.roleName} role.
          </Text>
        )}
        {error && (
          <Text variant="body-sm" className="text-danger">
            {error}
          </Text>
        )}
      </div>
    </BottomSheet>
  );
}

interface RowProps {
  node: PositionNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  canManage: boolean;
  onEdit: (position: LeadershipPosition) => void;
  onAddChild: (parent: PositionNode) => void;
  onAssign: (position: LeadershipPosition) => void;
  onUnassign: (position: LeadershipPosition, membershipId: string) => void;
}

function PositionRow({ node, depth, collapsedIds, onToggle, canManage, onEdit, onAddChild, onAssign, onUnassign }: RowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  return (
    <div>
      <div className="py-2.5 pr-2 border-b border-slate-100 dark:border-slate-800" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-label={isCollapsed ? `Expand ${node.title}` : `Collapse ${node.title}`}
              className="shrink-0 p-1 -ml-1 mt-0.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <button type="button" onClick={() => canManage && onEdit(node)} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Text variant="body" className="font-medium">
                {node.title}
              </Text>
              {node.roleName && (
                <Badge variant="primary" size="sm">
                  {node.roleName}
                </Badge>
              )}
              {node.unitName && (
                <Badge variant="neutral" size="sm">
                  {node.unitName}
                </Badge>
              )}
            </div>
            {node.description && (
              <Text variant="caption" color="muted">
                {node.description}
              </Text>
            )}
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => onAddChild(node)}
              aria-label={`Add a position under ${node.title}`}
              className="shrink-0 p-2 rounded-full text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 ml-8">
          {node.holders.map((holder) => (
            <span key={holder.membershipId} className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 pl-1 pr-2 py-1">
              <Avatar src={holder.photoUrl ?? undefined} name={`${holder.firstName} ${holder.lastName}`} size="xs" />
              <Text variant="caption">{`${holder.firstName} ${holder.lastName}`}</Text>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onUnassign(node, holder.membershipId)}
                  aria-label={`Remove ${holder.firstName} ${holder.lastName} from ${node.title}`}
                  className="text-slate-400 hover:text-danger transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {canManage && (
            <button
              type="button"
              onClick={() => onAssign(node)}
              className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-2 py-1 text-caption text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <UserPlus size={12} aria-hidden /> Assign
            </button>
          )}
          {node.holders.length === 0 && !canManage && (
            <Text variant="caption" color="muted">
              Vacant
            </Text>
          )}
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className={cn(depth === 0 && 'bg-slate-50/50 dark:bg-slate-800/20')}>
          {node.children.map((child) => (
            <PositionRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              canManage={canManage}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onAssign={onAssign}
              onUnassign={onUnassign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadershipStructure() {
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<{ kind: 'add'; parent: PositionNode | null } | { kind: 'edit'; position: LeadershipPosition } | null>(null);
  const [assignFor, setAssignFor] = useState<LeadershipPosition | null>(null);

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['leadership', 'positions'],
    queryFn: () => leadershipService.list(),
  });

  const tree = useMemo(() => buildPositionTree(positions), [positions]);

  const unassign = useMutation({
    mutationFn: ({ positionId, membershipId }: { positionId: string; membershipId: string }) =>
      leadershipService.unassign(positionId, membershipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leadership', 'positions'] }),
  });

  if (!can('team:read')) {
    return <Navigate to="/403" replace />;
  }

  const canManage = can('leadership:manage');

  function toggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Text variant="h1" className="mb-1">
            Leadership
          </Text>
          <Text variant="body" color="muted">
            Named positions, who holds them, and what access each one grants.
          </Text>
        </div>
        {canManage && tree.length > 0 && (
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={() => setSheet({ kind: 'add', parent: null })}>
            Add
          </Button>
        )}
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading structure…
        </Text>
      )}

      {!isLoading && tree.length === 0 && (
        <EmptyState
          icon={Network}
          title="No positions yet"
          description="Define the roles your church recognises — Senior Pastor, Elder, Deacon — and who holds each one."
          action={
            canManage ? (
              <Button variant="primary" leftIcon={Plus} onClick={() => setSheet({ kind: 'add', parent: null })}>
                Add the first position
              </Button>
            ) : undefined
          }
        />
      )}

      {tree.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          {tree.map((node) => (
            <PositionRow
              key={node.id}
              node={node}
              depth={0}
              collapsedIds={collapsedIds}
              onToggle={toggle}
              canManage={canManage}
              onEdit={(position) => setSheet({ kind: 'edit', position })}
              onAddChild={(parent) => setSheet({ kind: 'add', parent })}
              onAssign={setAssignFor}
              onUnassign={(position, membershipId) => unassign.mutate({ positionId: position.id, membershipId })}
            />
          ))}
        </Card>
      )}

      {sheet?.kind === 'add' && (
        <PositionSheet parent={sheet.parent} positions={positions} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'edit' && (
        <PositionSheet parent={null} position={sheet.position} positions={positions} onClose={() => setSheet(null)} />
      )}
      {assignFor && <AssignSheet position={assignFor} onClose={() => setAssignFor(null)} />}
    </div>
  );
}
