/**
 * @file CreateEditEvent.tsx
 * @description Create or edit a gathering.
 *
 * Saving creates or updates the gathering and nothing more: a new gathering is
 * always a draft, and publishing is a separate step on its own page. Who can see
 * it once published is its visibility. Times are the church's, not the browser's.
 *
 * Attendance mode is chosen here rather than at the door, because it determines
 * what the Sunday-morning screen does: individual check-in for a service where
 * names matter, a headcount where they do not. Getting it right in advance saves
 * a decision at the worst possible moment.
 *
 * The parts live in components/events/form/; this screen holds the form's state,
 * loads the gathering and sends it.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import type { EventType } from '@/types';
import { API_MODE } from '@/services/adapter';
import { eventsService, type EventWrite } from '@/services/eventsService';
import { commsService } from '@/services/commsService';
import { groupsService } from '@/services/groupsService';
import { orgService } from '@/services/orgService';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { useRole } from '@/hooks/useRole';
import { apiFieldErrors } from '@/lib/formErrors';
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from '@/lib/events';
import { all, minLength, required, useFieldErrors } from '@/lib/validation';
import { Button, Card, Input, SegmentedControl, Select, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { CancelGathering } from '@/components/events/form/CancelGathering';
import { CollisionNotice } from '@/components/events/form/CollisionNotice';
import { EditConflictBanner } from '@/components/events/form/EditConflictBanner';
import { RecurrenceControl } from '@/components/events/form/RecurrenceControl';
import { RegistrationQuestions } from '@/components/events/form/RegistrationQuestions';
import { VisibilityControl } from '@/components/events/form/VisibilityControl';
import { WhenFields } from '@/components/events/form/WhenFields';
import { recurrenceProblem } from '@/components/events/form/recurrence';
import {
  blankValues,
  changedFields,
  collisionRange,
  endAfterStart,
  groupWhenPrivate,
  isEditConflict,
  requestLevelMessages,
  startDayOf,
  toPayload,
  valuesFromEvent,
  withAllDay,
  type EventFormValues,
} from '@/components/events/form/eventForm';

const EVENT_TYPES = (Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((value) => ({
  value,
  label: EVENT_TYPE_LABEL[value],
}));

/** Server field names this screen shows next to an input; anything else goes in the banner. */
const PLACED_SERVER_FIELDS = new Set(['title', 'startDateTime', 'endDateTime', 'groupId', 'recurrenceRule']);

/** What the screen knows after someone else saved the gathering first. */
interface Conflict {
  stage: 'conflicted' | 'reloaded';
  /** The version just loaded, once reloaded. */
  latest?: EventFormValues;
  /** Fields they changed since this form was loaded. */
  theirs: string[];
}

export function CreateEditEvent() {
  const { id } = useParams();
  // A new key per gathering: moving between two edit URLs starts a clean form.
  return <EventFormScreen key={id ?? 'new'} id={id} />;
}

function EventFormScreen({ id }: { id?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { can } = useRole();
  const isEditing = Boolean(id);

  // Times are placed on the church's clock, so the form waits to know it.
  const zone = useChurchTimeZone();
  const profile = useQuery({
    queryKey: ['org', 'profile'],
    queryFn: () => orgService.getProfile(),
    enabled: API_MODE === 'rest',
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const zoneReady = API_MODE !== 'rest' || profile.isSuccess;

  const eventQuery = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id!),
    enabled: isEditing,
    refetchOnMount: 'always',
  });
  const event = eventQuery.data;

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => groupsService.list() });

  // The form starts once, from the saved gathering (fresh, not a cached copy) or the blank form.
  const [values, setValues] = useState<EventFormValues | null>(null);
  const [base, setBase] = useState<{ updatedAt: string; values: EventFormValues } | null>(null);
  if (values === null && zoneReady && (!isEditing || (event && !eventQuery.isFetching))) {
    const initial = event ? valuesFromEvent(event, zone) : blankValues(searchParams.get('start'));
    setValues(initial);
    setBase({ updatedAt: event?.updatedAt ?? '', values: initial });
  }
  const form = values ?? blankValues();
  const patch = (change: Partial<EventFormValues>) => setValues((prev) => (prev ? { ...prev, ...change } : prev));

  const [conflict, setConflict] = useState<Conflict | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const payload = toPayload(form, isEditing ? base?.updatedAt : undefined) as Partial<EventWrite>;
      return isEditing ? eventsService.update(id!, payload) : eventsService.create(payload);
    },
    meta: { inline: true },
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event', saved.id] }),
      ]);
      navigate(`/staff/events/${saved.id}`);
    },
    onError: (error) => {
      if (isEditConflict(error)) setConflict({ stage: 'conflicted', theirs: [] });
    },
  });

  const reload = useMutation({
    mutationFn: async () => {
      // refetch() never throws: a failed one resolves with isError and the old data still set.
      const result = await eventQuery.refetch();
      if (result.isError) throw result.error;
      if (!result.data) throw new Error('Couldn’t load the latest version');
      return result.data;
    },
    meta: { inline: true },
    onSuccess: (latestEvent) => {
      // Their version becomes the base to save against; the form is left as typed.
      const latest = valuesFromEvent(latestEvent, zone);
      setConflict({ stage: 'reloaded', latest, theirs: base ? changedFields(base.values, latest) : [] });
      setBase({ updatedAt: latestEvent.updatedAt, values: latest });
      save.reset();
    },
  });

  // ── Checking ───────────────────────────────────────────────────────────
  const startDay = startDayOf(form);
  const server = apiFieldErrors(save.error);
  const rules = useMemo(
    () => ({
      title: all(required('Title'), minLength('Title', 2)),
      start: required(form.allDay ? 'First day' : 'Start'),
      end: endAfterStart(form.start, form.allDay),
      groupId: groupWhenPrivate(form.visibility),
    }),
    [form.start, form.allDay, form.visibility],
  );
  const { field, validateAll } = useFieldErrors(
    { title: form.title, start: form.start, end: form.end, groupId: form.groupId },
    rules,
    { title: server.title, start: server.startDateTime, end: server.endDateTime, groupId: server.groupId },
  );

  // Other groups' gatherings this one would overlap — checked as soon as a group
  // and a start are both picked, so the clash is seen before saving.
  const range = collisionRange(form, zone);
  const collisions = useQuery({
    queryKey: ['events', 'collisions', form.groupId, range?.startDateTime, range?.endDateTime, id],
    queryFn: () => eventsService.checkCollisions({ groupId: form.groupId, ...range!, excludeEventId: id }),
    enabled: API_MODE === 'rest' && Boolean(form.groupId && range),
    retry: false,
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldsOk = validateAll();
    if (!fieldsOk || recurrenceProblem(form.recurrence, startDay)) return;
    save.mutate();
  }

  // ── What to show ───────────────────────────────────────────────────────
  if (API_MODE === 'rest' && profile.isError && !profile.data) {
    return (
      <Shell>
        <ErrorNotice error={profile.error} />
        <Button type="button" variant="secondary" onClick={() => void profile.refetch()}>
          Try again
        </Button>
      </Shell>
    );
  }

  if (isEditing && eventQuery.isError && !event) {
    return (
      <Shell>
        <ErrorNotice error={eventQuery.error} />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void eventQuery.refetch()}>
            Try again
          </Button>
          <Link to="/staff/events">
            <Button type="button" variant="ghost">
              Back to gatherings
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (values === null) {
    return (
      <Shell>
        <div role="status" aria-live="polite" aria-label="Loading gathering" className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Shell>
    );
  }

  const locked = isEditing && (event?.status === 'canceled' || event?.status === 'completed');
  const canSave = can(isEditing ? 'events:update' : 'events:create');
  const canManage = isEditing && can('events:update');

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));
  // A group that was archived since still belongs to the gathering.
  if (form.groupId && !groupOptions.some((g) => g.value === form.groupId)) {
    groupOptions.push({ value: form.groupId, label: event?.groupName ?? 'Current group' });
  }

  const requestMessages = requestLevelMessages(save.error);
  const unplacedServerField = Object.keys(server).some((key) => !PLACED_SERVER_FIELDS.has(key));
  const showSaveError =
    save.isError &&
    !isEditConflict(save.error) &&
    (requestMessages.length > 0 || unplacedServerField || Object.keys(server).length === 0);

  const overwritten =
    conflict?.stage === 'reloaded' && conflict.latest
      ? conflict.theirs.filter((name) => changedFields(form, conflict.latest!).includes(name))
      : [];

  return (
    <Shell>
      <header>
        <Text variant="h1" className="mb-1">
          {isEditing ? 'Edit gathering' : 'New gathering'}
        </Text>
        <Text variant="body" color="muted">
          {isEditing
            ? 'Every change is recorded in the gathering’s history.'
            : 'New gatherings are saved as drafts. Send one for review or publish it from its page.'}
        </Text>
      </header>

      {locked && event && (
        <Card accent="warning" variant="outline" padding="md" className="space-y-2" role="status">
          <Text variant="label" className="flex items-center gap-1.5">
            <Info size={14} aria-hidden /> This gathering is {EVENT_STATUS_LABEL[event.status].toLowerCase()}
          </Text>
          <Text variant="body-sm">A {EVENT_STATUS_LABEL[event.status].toLowerCase()} gathering can’t be edited.</Text>
          <Link to={`/staff/events/${event.id}`} className="inline-flex min-h-11 items-center text-body-sm text-primary hover:underline">
            Back to the gathering
          </Link>
        </Card>
      )}

      {event?.status === 'pending_review' && (
        <Card variant="flat" padding="md">
          <Text variant="body-sm">
            This gathering is waiting for review. Saving changes sends it back to draft, and its reviewers will need to
            look at it again.
          </Text>
        </Card>
      )}

      {conflict && (
        <EditConflictBanner
          stage={conflict.stage}
          overwritten={overwritten}
          reloading={reload.isPending}
          reloadError={reload.error}
          attentionKey={conflict}
          onReload={() => reload.mutate()}
          onUseLatest={() => {
            if (conflict.latest) setValues(conflict.latest);
            setConflict(null);
          }}
        />
      )}

      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <fieldset disabled={locked} className="min-w-0 space-y-5">
          <Input
            label="Title"
            autoFocus={!isEditing}
            placeholder="Sunday Morning Service"
            maxLength={160}
            required
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            {...field('title')}
          />

          <Select
            label="Type"
            value={form.type}
            onChange={(e) => patch({ type: e.target.value as EventType })}
            options={EVENT_TYPES}
          />

          <WhenFields
            allDay={form.allDay}
            start={form.start}
            end={form.end}
            zone={zone}
            onAllDayChange={(allDay) => setValues((prev) => (prev ? withAllDay(prev, allDay) : prev))}
            onStartChange={(start) => patch({ start })}
            onEndChange={(end) => patch({ end })}
            startField={field('start')}
            endField={field('end')}
          />

          <Input
            label="Location"
            placeholder="Main Sanctuary"
            maxLength={200}
            value={form.location}
            onChange={(e) => patch({ location: e.target.value })}
          />

          <RecurrenceControl
            value={form.recurrence}
            onChange={(recurrence) => patch({ recurrence })}
            startDay={startDay}
            error={server.recurrenceRule}
          />

          <Select
            label="Branch / unit"
            value={form.unitId}
            onChange={(e) => patch({ unitId: e.target.value })}
            options={[{ value: '', label: 'Whole church' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
          />

          <VisibilityControl
            visibility={form.visibility}
            groupId={form.groupId}
            groups={groupOptions}
            onVisibilityChange={(visibility) => patch({ visibility })}
            onGroupChange={(groupId) => patch({ groupId })}
            groupField={field('groupId')}
          />

          <CollisionNotice collisions={collisions.data ?? []} eventId={id} zone={zone} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-description" className="text-label text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              id="event-description"
              rows={4}
              maxLength={5000}
              placeholder="Optional — what people should know before they come."
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
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
              value={form.attendanceMode}
              onChange={(attendanceMode) => patch({ attendanceMode })}
              options={[
                { value: 'individual', label: 'By name' },
                { value: 'headcount', label: 'Headcount' },
              ]}
            />
            <Text variant="caption" color="muted" className="block mt-2">
              {form.attendanceMode === 'individual'
                ? 'Staff tap each person present. Feeds attendance history and absence alerts.'
                : 'Staff enter totals only. Fast, but no individual records.'}
            </Text>
          </Card>
        </fieldset>

        {showSaveError && (
          <ErrorNotice error={requestMessages.length > 0 ? new Error(requestMessages.join('. ')) : save.error} />
        )}

        {!locked && canSave && (
          <Button type="submit" variant="primary" size="lg" fullWidth leftIcon={Check} isLoading={save.isPending}>
            {isEditing ? 'Save changes' : 'Create gathering'}
          </Button>
        )}

        {!locked && canManage && event && (
          <CancelGathering eventId={event.id} title={event.title} isRecurring={event.isRecurring} />
        )}
      </form>

      {/* Outside the form: pressing Enter in a question must not save the gathering. */}
      {canManage && id && <RegistrationQuestions eventId={id} title={form.title} />}
      {!isEditing && (
        <Card variant="flat" padding="md">
          <Text variant="body-sm" color="muted">
            Save this gathering first to add registration questions.
          </Text>
        </Card>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">{children}</div>;
}
