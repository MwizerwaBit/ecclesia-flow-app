/**
 * @file CreateEditEvent.tsx
 * @description Create or edit a gathering.
 *
 * Attendance mode is chosen here rather than at the door, because it determines
 * what the Sunday-morning screen does: individual check-in for a service where
 * names matter, a headcount where they do not. Getting it right in advance saves
 * a decision at the worst possible moment.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bell, Check, ClipboardList, Copy, Plus, Trash2, Users } from 'lucide-react';
import type { AttendanceMode, EventType, RegistrationFieldDraft, RegistrationFieldType } from '@/types';
import { eventsService } from '@/services/eventsService';
import { commsService } from '@/services/commsService';
import { groupsService } from '@/services/groupsService';
import { orgService } from '@/services/orgService';
import { shareOrCopy } from '@/lib/download';
import { Avatar, Badge, Button, Card, Checkbox, Input, SegmentedControl, Select, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/formatters';

const FIELD_TYPES: Array<{ value: RegistrationFieldType; label: string }> = [
  { value: 'text', label: 'Short answer' },
  { value: 'single_choice', label: 'Choose one' },
  { value: 'checkbox', label: 'Choose any' },
];

function blankField(): RegistrationFieldDraft {
  return { label: '', fieldType: 'text', options: [], required: false };
}

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: 'service', label: 'Service' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'event', label: 'Event' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'other', label: 'Other' },
];

const RECURRENCE = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=WEEKLY;BYDAY=SU', label: 'Every Sunday' },
  { value: 'FREQ=WEEKLY;BYDAY=WE', label: 'Every Wednesday' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
];

export function CreateEditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('service');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('individual');
  const [unitId, setUnitId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [isPublic, setPublic] = useState(true);
  const [publish, setPublish] = useState(true);

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.list(),
  });

  // Other groups' gatherings this one would overlap — checked live as soon
  // as a group and a start time are both picked, so the clash is visible
  // before saving, not discovered afterward.
  const { data: collisions = [] } = useQuery({
    queryKey: ['events', 'collisions', groupId, startDateTime, endDateTime, id],
    queryFn: () =>
      eventsService.checkCollisions({
        groupId,
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: endDateTime ? new Date(endDateTime).toISOString() : undefined,
        excludeEventId: id,
      }),
    enabled: Boolean(groupId && startDateTime),
  });

  const notify = useMutation({
    mutationFn: ({ collidingEventId, memberIds }: { collidingEventId: string; memberIds: string[] }) =>
      eventsService.notifyConflict(id ?? '', collidingEventId, memberIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', 'collisions'] }),
  });

  // ── Registration questions — only exist once the event does. ───────────
  const [fields, setFields] = useState<RegistrationFieldDraft[]>([]);
  const [fieldsDirty, setFieldsDirty] = useState(false);

  useQuery({
    queryKey: ['events', id, 'fields'],
    queryFn: async () => {
      const saved = await eventsService.getRegistrationFields(id!);
      if (!fieldsDirty) {
        setFields(saved.map(({ label, fieldType, options, required }) => ({ label, fieldType, options, required })));
      }
      return saved;
    },
    enabled: isEditing,
  });

  const { data: org } = useQuery({ queryKey: ['org', 'profile'], queryFn: () => orgService.getProfile() });
  const shareUrl = org && id ? `${window.location.origin}/c/${org.slug}/events/${id}` : '';

  const saveFields = useMutation({
    mutationFn: () => eventsService.setRegistrationFields(id!, fields),
    onSuccess: (saved) => {
      setFields(saved.map(({ label, fieldType, options, required }) => ({ label, fieldType, options, required })));
      setFieldsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['events', id, 'fields'] });
    },
  });

  function updateField(index: number, patch: Partial<RegistrationFieldDraft>) {
    setFieldsDirty(true);
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function moveField(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    setFieldsDirty(true);
    setFields((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeField(index: number) {
    setFieldsDirty(true);
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  // Prefill when editing an existing gathering.
  useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const event = await eventsService.getById(id!);
      setTitle(event.title);
      setType(event.type);
      setDescription(event.description ?? '');
      setLocation(event.location ?? '');
      setStartDateTime(event.startDateTime.slice(0, 16));
      setEndDateTime(event.endDateTime?.slice(0, 16) ?? '');
      setRecurrenceRule(event.recurrenceRule ?? '');
      setAttendanceMode(event.attendanceMode);
      setUnitId(event.unitId ?? '');
      setGroupId(event.groupId ?? '');
      setPublic(event.isPublic);
      setPublish(event.status === 'published');
      return event;
    },
    enabled: isEditing,
  });

  // Cancelling keeps the record and its attendance; it only changes status, so
  // the gathering still appears in history rather than vanishing from reports.
  const cancelEvent = useMutation({
    mutationFn: () => eventsService.update(id!, { status: 'canceled' }),
    onSuccess: (event) => navigate(`/staff/events/${event.id}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDateTime,
        endDateTime: endDateTime || undefined,
        isRecurring: Boolean(recurrenceRule),
        recurrenceRule: recurrenceRule || undefined,
        attendanceMode,
        unitId: unitId || undefined,
        groupId: groupId || undefined,
        isPublic,
        status: publish ? ('published' as const) : ('draft' as const),
      };
      return isEditing ? eventsService.update(id!, payload) : eventsService.create(payload);
    },
    onSuccess: (event) => navigate(`/staff/events/${event.id}`),
  });

  const canSave = title.trim().length > 0 && startDateTime.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          {isEditing ? 'Edit gathering' : 'New gathering'}
        </Text>
        <Text variant="body" color="muted">
          Published gatherings appear in your congregation&rsquo;s portal.
        </Text>
      </header>

      <Input
        label="Title"
        autoFocus
        placeholder="Sunday Morning Service"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as EventType)}
        options={EVENT_TYPES}
      />

      <Input
        label="Starts"
        type="datetime-local"
        value={startDateTime}
        onChange={(e) => setStartDateTime(e.target.value)}
      />

      <Input
        label="Ends"
        type="datetime-local"
        placeholder="Optional"
        value={endDateTime}
        onChange={(e) => setEndDateTime(e.target.value)}
      />

      <Input
        label="Location"
        placeholder="Main Sanctuary"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <Select
        label="Repeats"
        value={recurrenceRule}
        onChange={(e) => setRecurrenceRule(e.target.value)}
        options={RECURRENCE}
      />

      <Select
        label="Branch / unit"
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        options={[
          { value: '', label: 'Whole church' },
          ...units.map((u) => ({ value: u.id, label: u.name })),
        ]}
      />

      <Select
        label="Group (optional)"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        options={[{ value: '', label: 'Not tied to a group' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
      />

      {groupId && startDateTime && collisions.length > 0 && (
        <Card variant="outline" padding="md" className="border-warning/50 bg-warning-light/40 space-y-3">
          <Text variant="label" className="flex items-center gap-1.5 text-warning">
            <AlertTriangle size={14} aria-hidden /> Schedule clash
          </Text>
          {collisions.map((c) => (
            <div key={c.eventId} className="space-y-2 border-t border-warning/20 pt-2 first:border-t-0 first:pt-0">
              <Text variant="body-sm">
                Overlaps <strong>{c.eventTitle}</strong> ({c.groupName}, {formatDateTime(c.startDateTime)}) —
                about {c.affectedMemberCount} {c.affectedMemberCount === 1 ? 'person is' : 'people are'} in both
                groups.
              </Text>
              {c.keyParticipants.length > 0 && (
                <div className="space-y-1.5">
                  {c.keyParticipants.map((kp) => (
                    <div key={kp.memberId} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar name={kp.name} size="xs" />
                        <Text variant="caption" className="truncate">
                          {kp.name} leads {kp.groupName}
                        </Text>
                        <Badge variant="warning" size="sm">
                          <Users size={10} aria-hidden /> Key
                        </Badge>
                      </span>
                      {isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={Bell}
                          isLoading={notify.isPending && notify.variables?.memberIds[0] === kp.memberId}
                          onClick={() => notify.mutate({ collidingEventId: c.eventId, memberIds: [kp.memberId] })}
                        >
                          Ask them
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!isEditing && (
            <Text variant="caption" color="muted">
              Save the gathering first to notify a leader directly.
            </Text>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-description" className="text-label text-slate-700 dark:text-slate-300">
          Description
        </label>
        <textarea
          id="event-description"
          rows={4}
          placeholder="Optional — what people should know before they come."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Attendance mode decides what the Sunday screen does */}
      <Card variant="outline" padding="md">
        <Text variant="label" color="muted" className="mb-2 block">
          How attendance is taken
        </Text>
        <SegmentedControl
          label="Attendance mode"
          value={attendanceMode}
          onChange={setAttendanceMode}
          options={[
            { value: 'individual', label: 'By name' },
            { value: 'headcount', label: 'Headcount' },
          ]}
        />
        <Text variant="caption" color="muted" className="block mt-2">
          {attendanceMode === 'individual'
            ? 'Staff tap each person present. Feeds attendance history and absence alerts.'
            : 'Staff enter totals only. Fast, but no individual records.'}
        </Text>
      </Card>

      {isEditing ? (
        <Card variant="outline" padding="md" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Text variant="label" color="muted">
              Registration questions
            </Text>
            {fields.length > 0 && (
              <Link to={`/staff/events/${id}/responses`} className="text-body-sm text-primary hover:underline flex items-center gap-1">
                <ClipboardList size={13} aria-hidden /> View responses
              </Link>
            )}
          </div>
          <Text variant="caption" color="muted" className="-mt-2 block">
            Shown on the public share link before anyone RSVPs. Leave empty for a plain "I'll be there".
          </Text>

          {shareUrl && (
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-caption" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={Copy}
                onClick={() => shareOrCopy({ title: title || 'Gathering', url: shareUrl })}
              >
                Copy
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    label="Question"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    label="Type"
                    value={field.fieldType}
                    onChange={(e) =>
                      updateField(index, {
                        fieldType: e.target.value as RegistrationFieldType,
                        options: e.target.value === 'text' ? [] : field.options,
                      })
                    }
                    options={FIELD_TYPES}
                  />
                </div>

                {field.fieldType !== 'text' && (
                  <Input
                    label="Options (comma-separated)"
                    value={field.options.join(', ')}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}

                <div className="flex items-center justify-between">
                  <Checkbox
                    label="Required"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveField(index, -1)} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </Button>
                    <Button type="button" variant="ghost" size="sm" leftIcon={Trash2} onClick={() => removeField(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={Plus}
              onClick={() => {
                setFieldsDirty(true);
                setFields((prev) => [...prev, blankField()]);
              }}
            >
              Add question
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={saveFields.isPending}
              disabled={!fieldsDirty || fields.some((f) => !f.label.trim() || (f.fieldType !== 'text' && f.options.length === 0))}
              onClick={() => saveFields.mutate()}
            >
              Save questions
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="flat" padding="md">
          <Text variant="body-sm" color="muted">
            Save this gathering first to add registration questions.
          </Text>
        </Card>
      )}

      <div className="space-y-3">
        <Checkbox
          label="Publish now"
          description="Unpublished gatherings stay visible to staff only."
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
        />
        <Checkbox
          label="Show on the public calendar"
          description="Visitors can see this without signing in."
          checked={isPublic}
          onChange={(e) => setPublic(e.target.checked)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={Check}
        disabled={!canSave}
        isLoading={save.isPending}
        onClick={() => save.mutate()}
      >
        {isEditing ? 'Save changes' : 'Create gathering'}
      </Button>

      {isEditing && (
        <Button
          variant="ghost"
          fullWidth
          leftIcon={Trash2}
          isLoading={cancelEvent.isPending}
          onClick={() => cancelEvent.mutate()}
        >
          Cancel this gathering
        </Button>
      )}
    </div>
  );
}
