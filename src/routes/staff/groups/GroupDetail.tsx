/**
 * @file GroupDetail.tsx
 * @description One group: who leads it, who is in it, when and where it meets.
 *
 * The roster is the point of the page, so on desktop it takes the wide column
 * as a table where roles and notes (a voice part, a rota slot) are edited in
 * place; the group's facts sit beside it. Adding people is a picker over the
 * church's own directory, many at a time.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Edit, Lock, MapPin, Megaphone, Search, Trash2, UserPlus, UsersRound } from 'lucide-react';
import type { GroupRole, GroupRosterEntry } from '@/types';
import { groupsService } from '@/services/groupsService';
import { membersService } from '@/services/membersService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Badge, BottomSheet, Button, Card, DataTable, EmptyState, Input, Select, Skeleton, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';
import { GROUP_ROLE_LABELS, GROUP_TYPE_LABELS, STATUS_LABELS, formatSchedule } from '@/lib/people';
import { cn } from '@/lib/cn';

const ROLE_OPTIONS = (Object.entries(GROUP_ROLE_LABELS) as Array<[GroupRole, string]>).map(([value, label]) => ({ value, label }));

export function GroupDetail() {
  const { id = '' } = useParams();
  const { can } = useRole();
  const canManage = can('groups:manage');
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [isAddOpen, setAddOpen] = useState(false);

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsService.getById(id),
    enabled: Boolean(id),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['group', id] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['members'] }),
      queryClient.invalidateQueries({ queryKey: ['member'] }),
    ]);

  const updateMembership = useMutation({
    mutationFn: ({ memberId, patch }: { memberId: string; patch: { role?: GroupRole; note?: string } }) =>
      groupsService.updateMembership(id, memberId, patch),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => groupsService.removeMember(id, memberId),
    onSuccess: refresh,
  });

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (group?.roster ?? []).filter((e) =>
      q ? `${e.member.firstName} ${e.member.lastName}`.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q) : true,
    );
  }, [group, query]);

  if (isError) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <Text variant="h2" className="mb-4">
          That group isn’t in your church
        </Text>
        <Link to="/staff/groups">
          <Button variant="secondary">Back to groups</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !group) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const schedule = formatSchedule(group.schedule);
  const counts = {
    leader: group.roster.filter((e) => e.role === 'leader').length,
    assistant: group.roster.filter((e) => e.role === 'assistant').length,
  };

  const roleControl = (entry: GroupRosterEntry) =>
    canManage ? (
      <Select
        aria-label={`Role of ${entry.member.firstName} ${entry.member.lastName}`}
        value={entry.role}
        onChange={(e) => updateMembership.mutate({ memberId: entry.memberId, patch: { role: e.target.value as GroupRole } })}
        options={ROLE_OPTIONS}
        className="w-36 [&_select]:h-9"
      />
    ) : (
      <Badge size="sm" variant={entry.role === 'leader' ? 'primary' : 'neutral'}>
        {GROUP_ROLE_LABELS[entry.role]}
      </Badge>
    );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 animate-fade-in space-y-5 xl:space-y-6">
      <Link to="/staff/groups" className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} aria-hidden /> Back to groups
      </Link>

      {/* Hero */}
      <Card padding="none" className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: group.color }} aria-hidden />
        <div className="p-5 xl:p-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <span className="hidden sm:flex size-14 rounded-2xl shrink-0 items-center justify-center text-white" style={{ backgroundColor: group.color }} aria-hidden>
              <UsersRound size={26} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="display" as="h1">
                  {group.name}
                </Text>
                {group.isArchived && <Badge>Archived</Badge>}
                <Badge variant={group.isOpen ? 'success' : 'neutral'}>
                  {group.isOpen ? 'Open to join' : (
                    <>
                      <Lock size={11} aria-hidden /> Closed
                    </>
                  )}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-slate-500">
                <span>{GROUP_TYPE_LABELS[group.type]}</span>
                {group.unitName && <span>{group.unitName}</span>}
                {schedule && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} aria-hidden /> {schedule}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canManage && (
              <Button variant="primary" size="sm" leftIcon={UserPlus} onClick={() => setAddOpen(true)}>
                Add people
              </Button>
            )}
            {can('announcements:create') && (
              <Link to="/staff/comms/announcements/new">
                <Button variant="secondary" size="sm" leftIcon={Megaphone}>
                  Message group
                </Button>
              </Link>
            )}
            {canManage && (
              <Link to={`/staff/groups/${group.id}/edit`}>
                <Button variant="ghost" size="sm" leftIcon={Edit}>
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Roster */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text variant="h2">
              Roster <span className="text-slate-400 font-sans text-body tabular-nums">({group.memberCount})</span>
            </Text>
            {group.roster.length > 0 && (
              <Input
                type="search"
                placeholder="Search the roster"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leftIcon={Search}
                className="sm:max-w-xs [&_input]:h-10"
              />
            )}
          </div>

          {group.roster.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No one in this group yet"
              description="Add people from your directory to start the roster."
              action={
                canManage ? (
                  <Button variant="primary" leftIcon={UserPlus} onClick={() => setAddOpen(true)}>
                    Add people
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Phone */}
              <div className="grid gap-2.5 xl:hidden">
                {roster.map((entry) => (
                  <Card key={entry.id} padding="sm" variant="elevated" className="flex items-center gap-3">
                    <Link to={`/staff/members/${entry.memberId}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar src={entry.member.photoUrl} name={`${entry.member.firstName} ${entry.member.lastName}`} size="md" />
                      <div className="min-w-0">
                        <p className="font-member-name text-h3 truncate">
                          {entry.member.firstName} {entry.member.lastName}
                        </p>
                        <Text variant="caption" color="muted" className="block truncate">
                          {GROUP_ROLE_LABELS[entry.role]}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </Text>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden xl:block">
                <DataTable
                  caption={`${group.name} roster`}
                  rows={roster}
                  rowKey={(e) => e.id}
                  columns={[
                    {
                      key: 'person',
                      header: 'Person',
                      render: (e) => (
                        <Link to={`/staff/members/${e.memberId}`} className="flex items-center gap-3 min-w-0 group">
                          <Avatar src={e.member.photoUrl} name={`${e.member.firstName} ${e.member.lastName}`} size="sm" />
                          <div className="min-w-0">
                            <span className="block font-member-name text-body-lg truncate group-hover:text-primary">
                              {e.member.firstName} {e.member.lastName}
                            </span>
                            <Text variant="caption" color="muted" className="block truncate">
                              {e.member.phone ?? e.member.email ?? 'No contact on file'}
                            </Text>
                          </div>
                        </Link>
                      ),
                    },
                    { key: 'role', header: 'Role', className: 'w-40', render: roleControl },
                    {
                      key: 'note',
                      header: 'Note',
                      render: (e) =>
                        canManage ? (
                          <NoteField
                            initial={e.note ?? ''}
                            label={`Note for ${e.member.firstName}`}
                            onSave={(note) => updateMembership.mutate({ memberId: e.memberId, patch: { note } })}
                          />
                        ) : (
                          <Text variant="body-sm" color="muted">
                            {e.note ?? '—'}
                          </Text>
                        ),
                    },
                    {
                      key: 'since',
                      header: 'Since',
                      className: 'hidden 2xl:table-cell w-32',
                      render: (e) => (
                        <Text variant="body-sm" color="muted" className="whitespace-nowrap">
                          {formatDate(e.joinedAt)}
                        </Text>
                      ),
                    },
                    ...(canManage
                      ? [
                          {
                            key: 'remove',
                            header: <span className="sr-only">Remove</span>,
                            align: 'right' as const,
                            className: 'w-14',
                            render: (e: GroupRosterEntry) => (
                              <button
                                type="button"
                                aria-label={`Remove ${e.member.firstName} ${e.member.lastName} from ${group.name}`}
                                title="Remove from group"
                                onClick={() => remove.mutate(e.memberId)}
                                className="inline-flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </>
          )}
        </div>

        {/* Facts */}
        <aside className="min-w-0 space-y-5">
          <Card padding="md" className="space-y-3">
            <Text variant="label" color="muted">
              About
            </Text>
            <Text variant="body-sm">{group.description ?? 'No description yet.'}</Text>
            {group.schedule?.location && (
              <Text variant="body-sm" color="muted" className="flex items-center gap-2">
                <MapPin size={14} aria-hidden /> {group.schedule.location}
              </Text>
            )}
          </Card>

          <Card padding="md">
            <Text variant="label" color="muted" className="block mb-3">
              Make-up
            </Text>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-body-sm text-slate-500">People</dt>
                <dd className="text-body-sm font-semibold tabular-nums">
                  {group.memberCount}
                  {group.capacity ? ` / ${group.capacity}` : ''}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-body-sm text-slate-500">Leaders</dt>
                <dd className={cn('text-body-sm font-semibold tabular-nums', counts.leader === 0 && 'text-warning')}>{counts.leader}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-body-sm text-slate-500">Assistants</dt>
                <dd className="text-body-sm font-semibold tabular-nums">{counts.assistant}</dd>
              </div>
            </dl>
            {counts.leader === 0 && group.roster.length > 0 && (
              <Text variant="caption" className="block mt-3 text-warning">
                No leader yet — set someone’s role to Leader in the roster.
              </Text>
            )}
          </Card>

          {group.leaders.length > 0 && (
            <Card padding="md">
              <Text variant="label" color="muted" className="block mb-3">
                Led by
              </Text>
              <ul className="space-y-2.5">
                {group.leaders.map((leader) => (
                  <li key={leader.id}>
                    <Link to={`/staff/members/${leader.id}`} className="flex items-center gap-3 group">
                      <Avatar src={leader.photoUrl} name={`${leader.firstName} ${leader.lastName}`} size="sm" />
                      <Text variant="body-sm" className="font-medium group-hover:text-primary">
                        {leader.firstName} {leader.lastName}
                      </Text>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {canManage && (
        <AddMembersSheet
          open={isAddOpen}
          onClose={() => setAddOpen(false)}
          groupId={group.id}
          groupName={group.name}
          existing={new Set(group.roster.map((e) => e.memberId))}
          onAdded={refresh}
        />
      )}
    </div>
  );
}

/** A roster note that saves when the field loses focus, not on every keystroke. */
function NoteField({ initial, label, onSave }: { initial: string; label: string; onSave: (note: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      aria-label={label}
      value={value}
      placeholder="Add a note"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() !== initial && onSave(value.trim())}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-full min-w-32 h-9 rounded-lg border border-transparent bg-transparent px-2 text-body-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}

function AddMembersSheet({
  open,
  onClose,
  groupId,
  groupName,
  existing,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  existing: Set<string>;
  onAdded: () => Promise<unknown>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<GroupRole>('member');

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
    enabled: open,
  });

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster
      .filter((m) => !existing.has(m.id) && m.status !== 'inactive')
      .filter((m) => (q ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || (m.envelopeNumber ?? '').includes(q) : true));
  }, [roster, existing, query]);

  const add = useMutation({
    mutationFn: () => groupsService.addMembers(groupId, [...selected], role),
    onSuccess: async () => {
      await onAdded();
      close();
    },
  });

  function close() {
    setQuery('');
    setSelected(new Set());
    setRole('member');
    onClose();
  }

  function toggle(memberId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={`Add people to ${groupName}`}
      description="Pick from your directory. Inactive members are not listed."
      className="lg:max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select aria-label="Role for everyone added" value={role} onChange={(e) => setRole(e.target.value as GroupRole)} options={ROLE_OPTIONS} className="sm:w-40" />
          <Button variant="primary" fullWidth leftIcon={UserPlus} disabled={selected.size === 0} isLoading={add.isPending} onClick={() => add.mutate()}>
            {selected.size === 0 ? 'Choose people' : `Add ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`}
          </Button>
        </div>
      }
    >
      <Input type="search" placeholder="Search by name or envelope" value={query} onChange={(e) => setQuery(e.target.value)} leftIcon={Search} className="mb-3" />
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Text variant="body-sm" color="muted" className="py-6 text-center block">
          {query ? 'No one matches that.' : 'Everyone active is already in this group.'}
        </Text>
      ) : (
        <ul className="space-y-1" aria-label="People to add">
          {candidates.map((m) => {
            const isSelected = selected.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    isSelected ? 'bg-primary-light/60 dark:bg-primary/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border text-white',
                      isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600',
                    )}
                    aria-hidden
                  >
                    {isSelected && '✓'}
                  </span>
                  <Avatar src={m.photoUrl} name={`${m.firstName} ${m.lastName}`} size="sm" />
                  <span className="min-w-0 flex-1">
                    <Text variant="body-sm" className="font-medium block truncate">
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text variant="caption" color="muted" className="block truncate">
                      {STATUS_LABELS[m.status]}
                      {m.groups?.length ? ` · in ${m.groups.length} group${m.groups.length === 1 ? '' : 's'}` : ' · not in any group'}
                    </Text>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {add.isError && (
        <Text variant="caption" color="danger" className="block mt-3" role="alert">
          {add.error instanceof Error ? add.error.message : 'Adding failed.'}
        </Text>
      )}
    </BottomSheet>
  );
}
