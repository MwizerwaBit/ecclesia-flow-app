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
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Trash2 } from 'lucide-react';
import type { AttendanceMode, EventType } from '@/types';
import { eventsService } from '@/services/eventsService';
import { commsService } from '@/services/commsService';
import { Button, Card, Checkbox, Input, SegmentedControl, Select, Text } from '@/components/ui';

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
  const [isPublic, setPublic] = useState(true);
  const [publish, setPublish] = useState(true);

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

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
      setPublic(event.isPublic);
      setPublish(event.status === 'published');
      return event;
    },
    enabled: isEditing,
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
        label="Group"
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        options={[
          { value: '', label: 'Whole church' },
          ...units.map((u) => ({ value: u.id, label: u.name })),
        ]}
      />

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
        <Button variant="ghost" fullWidth leftIcon={Trash2}>
          Cancel this gathering
        </Button>
      )}
    </div>
  );
}
