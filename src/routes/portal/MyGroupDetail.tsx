/**
 * @file MyGroupDetail.tsx
 * @description One group, from a member's side: the roster, and — only for
 * whoever this group's own role grants it to, not by staff permission —
 * inviting people, changing a role, removing someone, and editing when and
 * where it meets. Mirrors staff/groups/GroupDetail.tsx's layout; the
 * difference is every "can I do this" check reads `myRole.capabilities`
 * from /me/groups/:id, not useRole()'s church-wide RBAC permissions, because
 * a group leader's authority here comes from the group, not their church role.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Edit, MapPin, Search, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { portalService } from '@/services/portalService';
import { Avatar, BottomSheet, Button, Card, EmptyState, Input, Select, Skeleton, Text } from '@/components/ui';
import { FREQUENCY_LABELS, GROUP_TYPE_LABELS, WEEKDAY_LABELS } from '@/lib/people';
import { cn } from '@/lib/cn';
import type { GroupType, MeetingFrequency, Weekday } from '@/types';

export function MyGroupDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['me', 'group', id],
    queryFn: () => portalService.group(id),
    enabled: Boolean(id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me', 'group', id] });

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => portalService.changeRole(id, memberId, role),
    onSuccess: (updated) => queryClient.setQueryData(['me', 'group', id], updated),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => portalService.remove(id, memberId),
    onSuccess: async (updated) => {
      if (updated) {
        queryClient.setQueryData(['me', 'group', id], updated);
      } else {
        // Removed myself: no updated detail comes back, so leave the page.
        await queryClient.invalidateQueries({ queryKey: ['me', 'groups'] });
        window.location.assign('/portal/groups');
      }
    },
  });

  if (isError) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <Text variant="h2" className="mb-4">
          That group isn't yours to see
        </Text>
        <Link to="/portal/groups">
          <Button variant="secondary">Back to my groups</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { group, myRole, roster, assignableRoles } = detail;
  const canManageRoster = myRole.capabilities.includes('manage_roster');
  const canEditGroup = myRole.capabilities.includes('edit_group');

  const scheduleParts = [FREQUENCY_LABELS[group.meetingFrequency as MeetingFrequency] ?? group.meetingFrequency];
  const when = [
    group.meetingDay ? (WEEKDAY_LABELS[group.meetingDay as Weekday] ?? group.meetingDay) : null,
    group.meetingTime,
  ]
    .filter(Boolean)
    .join(' ');
  if (when) scheduleParts.push(when);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <Link to="/portal/groups" className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} aria-hidden /> My groups
      </Link>

      <Card padding="none" className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: group.color }} aria-hidden />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text variant="h1" className="mb-1">
                {group.name}
              </Text>
              <Text variant="body-sm" color="muted">
                {GROUP_TYPE_LABELS[group.type as GroupType] ?? group.type} · You're the {myRole.name}
              </Text>
            </div>
            {canEditGroup && (
              <Button variant="ghost" size="sm" leftIcon={Edit} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
          </div>

          {group.description && (
            <Text variant="body-sm" color="muted">
              {group.description}
            </Text>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} aria-hidden /> {scheduleParts.join(' · ')}
            </span>
            {group.meetingLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} aria-hidden /> {group.meetingLocation}
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Text variant="h2">
          Roster <span className="text-slate-400 font-sans text-body tabular-nums">({roster.length})</span>
        </Text>
        {canManageRoster && (
          <Button variant="primary" size="sm" leftIcon={UserPlus} onClick={() => setInviteOpen(true)}>
            Invite
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {roster.map((person) => (
          <Card key={person.memberId} padding="sm" variant="elevated" className="flex items-center gap-3">
            <Avatar src={person.photoUrl ?? undefined} name={`${person.firstName} ${person.lastName}`} size="md" />
            <div className="min-w-0 flex-1">
              <Text variant="body-sm" className="font-bold truncate">
                {person.firstName} {person.lastName}
                {person.status === 'invited' && <span className="ml-2 text-caption font-normal text-slate-400">Invited</span>}
              </Text>
              <Text variant="caption" color="muted" className="block truncate">
                {person.roleName ?? person.role}
                {person.note ? ` · ${person.note}` : ''}
              </Text>
            </div>
            {canManageRoster && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  aria-label={`Role of ${person.firstName} ${person.lastName}`}
                  value={person.role}
                  onChange={(e) => changeRole.mutate({ memberId: person.memberId, role: e.target.value })}
                  options={assignableRoles.map((r) => ({ value: r.key, label: r.name }))}
                  className="w-32 [&_select]:h-9"
                />
                <button
                  type="button"
                  aria-label={`Remove ${person.firstName} ${person.lastName}`}
                  title="Remove from group"
                  onClick={() => removeMember.mutate(person.memberId)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-danger-light hover:text-danger transition-colors"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            )}
          </Card>
        ))}
        {roster.length === 0 && <EmptyState icon={UsersRound} title="No one here yet" description="Invite people to get this group started." />}
      </div>

      {canManageRoster && (
        <InviteSheet open={isInviteOpen} onClose={() => setInviteOpen(false)} groupId={id} groupName={group.name} assignableRoles={assignableRoles} onInvited={refresh} />
      )}
      {canEditGroup && (
        <EditGroupSheet
          open={isEditOpen}
          onClose={() => setEditOpen(false)}
          groupId={id}
          initial={{
            description: group.description ?? '',
            meetingDay: group.meetingDay ?? '',
            meetingTime: group.meetingTime ?? '',
            meetingLocation: group.meetingLocation ?? '',
          }}
        />
      )}
    </div>
  );
}

function InviteSheet({
  open,
  onClose,
  groupId,
  groupName,
  assignableRoles,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  assignableRoles: Array<{ key: string; name: string }>;
  onInvited: () => Promise<unknown>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState(assignableRoles.find((r) => r.key === 'member')?.key ?? assignableRoles[0]?.key ?? 'member');

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ['me', 'group', groupId, 'candidates', query],
    queryFn: () => portalService.candidates(groupId, query),
    enabled: open && query.trim().length >= 2,
  });

  const invite = useMutation({
    mutationFn: () => portalService.invite(groupId, [...selected], role),
    onSuccess: async () => {
      await onInvited();
      close();
    },
  });

  function close() {
    setQuery('');
    setSelected(new Set());
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
      title={`Invite people to ${groupName}`}
      description="Search the church directory. Type at least two letters."
      className="lg:max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select aria-label="Role for everyone invited" value={role} onChange={(e) => setRole(e.target.value)} options={assignableRoles.map((r) => ({ value: r.key, label: r.name }))} className="sm:w-40" />
          <Button variant="primary" fullWidth leftIcon={UserPlus} disabled={selected.size === 0} isLoading={invite.isPending} onClick={() => invite.mutate()}>
            {selected.size === 0 ? 'Choose people' : `Invite ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`}
          </Button>
        </div>
      }
    >
      <Input type="search" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} leftIcon={Search} className="mb-3" />
      {query.trim().length < 2 ? (
        <Text variant="body-sm" color="muted" className="py-6 text-center block">
          Keep typing to search.
        </Text>
      ) : isFetching ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Text variant="body-sm" color="muted" className="py-6 text-center block">
          No one matches that.
        </Text>
      ) : (
        <ul className="space-y-1" aria-label="People to invite">
          {candidates.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(c.id)}
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
                  <Avatar src={c.photoUrl ?? undefined} name={`${c.firstName} ${c.lastName}`} size="sm" />
                  <Text variant="body-sm" className="font-medium truncate">
                    {c.firstName} {c.lastName}
                  </Text>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {invite.isError && (
        <Text variant="caption" color="danger" className="block mt-3" role="alert">
          {invite.error instanceof Error ? invite.error.message : 'Inviting failed.'}
        </Text>
      )}
    </BottomSheet>
  );
}

function EditGroupSheet({
  open,
  onClose,
  groupId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  initial: { description: string; meetingDay: string; meetingTime: string; meetingLocation: string };
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);

  const save = useMutation({
    mutationFn: () =>
      portalService.editGroup(groupId, {
        description: form.description.trim() || null,
        meetingDay: form.meetingDay || null,
        meetingTime: form.meetingTime || null,
        meetingLocation: form.meetingLocation.trim() || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me', 'group', groupId], updated);
      onClose();
    },
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit group details"
      description="Change when and where this group meets."
      footer={
        <Button variant="primary" fullWidth isLoading={save.isPending} onClick={() => save.mutate()}>
          Save changes
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What this group is about"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Day"
            value={form.meetingDay}
            onChange={(e) => setForm((f) => ({ ...f, meetingDay: e.target.value }))}
            options={[{ value: '', label: 'Varies' }, ...Object.entries(WEEKDAY_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          <Input label="Time" type="time" value={form.meetingTime} onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))} />
        </div>
        <Input
          label="Where"
          placeholder="Room, address or online link"
          value={form.meetingLocation}
          onChange={(e) => setForm((f) => ({ ...f, meetingLocation: e.target.value }))}
        />
        {save.isError && (
          <Text variant="caption" color="danger" role="alert">
            {save.error instanceof Error ? save.error.message : 'Saving failed.'}
          </Text>
        )}
      </div>
    </BottomSheet>
  );
}
