/**
 * @file GroupForm.tsx
 * @description Create or edit a group — what it is, when it meets, who can join.
 *
 * One page rather than steps: a group has few enough fields that seeing them
 * all at once is quicker. On desktop the form sits beside a live preview of
 * the card the group will appear as in the list.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Lock } from 'lucide-react';
import type { GroupDetail, GroupInput, GroupType, MeetingFrequency, Weekday } from '@/types';
import { groupsService } from '@/services/groupsService';
import { commsService } from '@/services/commsService';
import { Badge, Button, Card, Checkbox, Input, Select, Skeleton, Text } from '@/components/ui';
import { FREQUENCY_LABELS, GROUP_COLORS, GROUP_TYPE_LABELS, WEEKDAY_LABELS, formatSchedule } from '@/lib/people';
import { cn } from '@/lib/cn';

interface GroupFormState {
  name: string;
  type: GroupType;
  description: string;
  unitId: string;
  frequency: MeetingFrequency;
  day: Weekday | '';
  time: string;
  location: string;
  capacity: string;
  isOpen: boolean;
  color: string;
}

function fromGroup(group?: GroupDetail): GroupFormState {
  return {
    name: group?.name ?? '',
    type: group?.type ?? 'ministry',
    description: group?.description ?? '',
    unitId: group?.unitId ?? '',
    frequency: group?.schedule?.frequency ?? 'weekly',
    day: group?.schedule?.day ?? '',
    time: group?.schedule?.time ?? '',
    location: group?.schedule?.location ?? '',
    capacity: group?.capacity ? String(group.capacity) : '',
    isOpen: group?.isOpen ?? true,
    color: group?.color ?? GROUP_COLORS[0],
  };
}

export function GroupForm() {
  const { id } = useParams();
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsService.getById(id!),
    enabled: Boolean(id),
  });

  if (id && (isLoading || !group)) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 xl:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return <GroupFormBody key={id ?? 'new'} group={group} />;
}

function GroupFormBody({ group }: { group?: GroupDetail }) {
  const isEditing = Boolean(group);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GroupFormState>(() => fromGroup(group));
  const [attempted, setAttempted] = useState(false);

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });

  function set<K extends keyof GroupFormState>(field: K, value: GroupFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const errors: Partial<Record<keyof GroupFormState, string>> = {};
  if (attempted) {
    if (!form.name.trim()) errors.name = 'Give the group a name.';
    if (form.capacity && (!/^\d+$/.test(form.capacity) || Number(form.capacity) < 1)) errors.capacity = 'Capacity is a whole number, or leave it empty.';
    if (form.time && !/^\d{2}:\d{2}$/.test(form.time)) errors.time = 'Use a time like 18:30.';
  }

  const input: GroupInput = {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim() || undefined,
    unitId: form.unitId || undefined,
    schedule: {
      frequency: form.frequency,
      day: form.frequency === 'irregular' ? undefined : form.day || undefined,
      time: form.frequency === 'irregular' ? undefined : form.time || undefined,
      location: form.location.trim() || undefined,
    },
    capacity: form.capacity ? Number(form.capacity) : undefined,
    isOpen: form.isOpen,
    color: form.color,
  };

  const save = useMutation({
    mutationFn: () => (group ? groupsService.update(group.id, input) : groupsService.create(input)),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['group', saved.id] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
      ]);
      navigate(`/staff/groups/${saved.id}`);
    },
  });

  const archive = useMutation({
    mutationFn: () => groupsService.update(group!.id, { isArchived: !group!.isArchived }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['group'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
      ]);
      navigate('/staff/groups');
    },
  });

  function submit() {
    setAttempted(true);
    const name = form.name.trim();
    const capacityOk = !form.capacity || (/^\d+$/.test(form.capacity) && Number(form.capacity) >= 1);
    const timeOk = !form.time || /^\d{2}:\d{2}$/.test(form.time);
    if (!name || !capacityOk || !timeOk) return;
    save.mutate();
  }

  const schedule = formatSchedule(input.schedule);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 xl:px-8 py-6 xl:py-8 animate-fade-in">
      <Link
        to={group ? `/staff/groups/${group.id}` : '/staff/groups'}
        className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft size={16} aria-hidden /> {group ? 'Back to group' : 'Back to groups'}
      </Link>

      <header className="mb-6">
        <Text variant="h1" className="xl:text-display">
          {isEditing ? `Edit ${group!.name}` : 'New group'}
        </Text>
        <Text variant="body" color="muted">
          Only the name is required. People are added from the group’s page once it exists.
        </Text>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
        <Card padding="none" className="overflow-hidden">
          <div className="px-5 xl:px-7 py-5 xl:py-6 space-y-6">
            <section className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Input label="Name *" autoFocus={!isEditing} value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" />
              <Select
                label="Kind of group"
                value={form.type}
                onChange={(e) => set('type', e.target.value as GroupType)}
                options={Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <Select
                label="Belongs to"
                value={form.unitId}
                onChange={(e) => set('unitId', e.target.value)}
                options={[{ value: '', label: 'The whole church' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
              />
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label htmlFor="group-description" className="text-label text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  id="group-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="What the group does and who it’s for"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </section>

            <section>
              <Text variant="h3" className="mb-3">
                When it meets
              </Text>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Select
                  label="How often"
                  value={form.frequency}
                  onChange={(e) => set('frequency', e.target.value as MeetingFrequency)}
                  options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                />
                {form.frequency !== 'irregular' ? (
                  <Select
                    label="Day"
                    value={form.day}
                    onChange={(e) => set('day', e.target.value as Weekday | '')}
                    options={[{ value: '', label: 'Varies' }, ...Object.entries(WEEKDAY_LABELS).map(([value, label]) => ({ value, label }))]}
                  />
                ) : (
                  <div className="hidden sm:block" />
                )}
                {form.frequency !== 'irregular' && (
                  <Input label="Time" type="time" value={form.time} error={errors.time} onChange={(e) => set('time', e.target.value)} />
                )}
                <Input label="Where" placeholder="Room, address or online link" value={form.location} onChange={(e) => set('location', e.target.value)} />
              </div>
            </section>

            <section>
              <Text variant="h3" className="mb-3">
                Joining
              </Text>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <Input
                  label="Capacity"
                  inputMode="numeric"
                  placeholder="No limit"
                  value={form.capacity}
                  error={errors.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                />
                <div className="self-end pb-2.5">
                  <Checkbox
                    label="Open to anyone"
                    description="Shown in the member portal; people can ask to join."
                    checked={form.isOpen}
                    onChange={(e) => set('isOpen', e.target.checked)}
                  />
                </div>
              </div>
            </section>

            <section>
              <Text variant="h3" className="mb-3">
                Colour
              </Text>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Group colour">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={`Colour ${color}`}
                    onClick={() => set('color', color)}
                    className={cn(
                      'size-9 rounded-full ring-offset-2 ring-offset-surface dark:ring-offset-surface-dark transition',
                      form.color === color ? 'ring-2 ring-slate-900 dark:ring-white' : 'hover:scale-110',
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {form.color === color && <Check size={16} className="mx-auto text-white" aria-hidden />}
                  </button>
                ))}
              </div>
            </section>

            {save.isError && (
              <Card accent="danger" padding="sm" role="alert">
                <Text variant="body-sm">{save.error instanceof Error ? save.error.message : 'Saving failed.'}</Text>
              </Card>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-5 xl:px-7 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            {isEditing && (
              <Button variant="ghost" isLoading={archive.isPending} onClick={() => archive.mutate()}>
                {group!.isArchived ? 'Restore group' : 'Archive group'}
              </Button>
            )}
            <div className="sm:flex-1" />
            <Link to={group ? `/staff/groups/${group.id}` : '/staff/groups'}>
              <Button variant="ghost" fullWidth>
                Cancel
              </Button>
            </Link>
            <Button variant="primary" leftIcon={Check} isLoading={save.isPending} onClick={submit} className="sm:min-w-40">
              {isEditing ? 'Save changes' : 'Create group'}
            </Button>
          </div>
        </Card>

        {/* Live preview */}
        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-2">
            <Text variant="label" color="muted">
              Preview
            </Text>
            <Card padding="none" variant="elevated" className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: form.color }} aria-hidden />
              <div className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Text variant="h3" className="truncate">
                    {form.name.trim() || 'Group name'}
                  </Text>
                  {!form.isOpen && (
                    <Badge size="sm">
                      <Lock size={10} aria-hidden /> Closed
                    </Badge>
                  )}
                </div>
                <Text variant="caption" color="muted">
                  {GROUP_TYPE_LABELS[form.type]}
                  {form.unitId ? ` · ${units.find((u) => u.id === form.unitId)?.name ?? ''}` : ''}
                </Text>
                {form.description && (
                  <Text variant="body-sm" color="muted" className="line-clamp-3">
                    {form.description}
                  </Text>
                )}
                {schedule && (
                  <Text variant="caption" color="muted" className="flex items-center gap-1.5">
                    <Clock size={13} aria-hidden /> {schedule}
                  </Text>
                )}
                <Text variant="body-sm" className="font-semibold pt-2">
                  {group ? `${group.memberCount} people` : 'No one yet'}
                  {form.capacity ? ` · up to ${form.capacity}` : ''}
                </Text>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
