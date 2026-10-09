/**
 * @file MemberForm.tsx
 * @description Register a new person, or edit an existing record.
 *
 * Five steps — identity, contact, church life, family, review & consent. Only
 * a handful of fields are required (see `registration.ts` for exactly which
 * and why); everything else is marked optional, and the Family step can be
 * skipped outright. The rules are checked per step so a mistake is caught
 * where it was made, not at the end.
 *
 * Seamless where it matters:
 *   - A registration in progress is kept as a draft (per church, on this
 *     device), so leaving to check something never loses the form.
 *   - People already on file with the same name, phone or email are shown as
 *     soon as those are entered, before a duplicate record is created.
 *   - Household and group memberships are set here and saved in the same
 *     operation as the person, so nothing needs a second visit.
 *
 * On desktop the steps sit in a rail beside the form and any reached step can
 * be revisited; fields lay out two-up. On a phone the rail collapses to a
 * progress bar and fields stack.
 *
 * Shared between `/staff/members/add` and `/staff/members/:id/edit` — editing
 * opens the same steps pre-filled, all of them reachable at once.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Pencil,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  UserPlus,
} from 'lucide-react';
import type { MemberDetail } from '@/types';
import { membersService } from '@/services/membersService';
import { groupsService } from '@/services/groupsService';
import { commsService } from '@/services/commsService';
import { currentTenantId } from '@/mocks/peopleStore';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Avatar, Badge, Button, Card, Checkbox, Input, Select, Skeleton, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import {
  CONTACT_CHANNEL_LABELS,
  GENDER_LABELS,
  GROUP_TYPE_LABELS,
  HOUSEHOLD_ROLE_LABELS,
  JOIN_METHOD_LABELS,
  MARITAL_LABELS,
  STATUS_LABELS,
  TITLE_OPTIONS,
  ageFrom,
  formatSchedule,
} from '@/lib/people';
import {
  STEPS,
  completeness,
  emptyForm,
  formFromMember,
  isMinor,
  toPayload,
  validateStep,
  type Errors,
  type FormState,
  type StepId,
} from './registration';

const DRAFT_PREFIX = 'ecclesiaflow-member-draft:';

function options<T extends string>(labels: Record<T, string>, placeholder?: string): Array<{ value: T | ''; label: string }> {
  const list = (Object.entries(labels) as Array<[T, string]>).map(([value, label]) => ({ value, label }));
  return placeholder ? [{ value: '', label: placeholder }, ...list] : list;
}

function readDraft(): FormState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + currentTenantId());
    return raw ? { ...emptyForm(), ...(JSON.parse(raw) as Partial<FormState>) } : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + currentTenantId());
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export function MemberForm() {
  const { id } = useParams();

  const { data: member, isLoading, isError } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersService.getById(id!),
    enabled: Boolean(id),
  });

  if (id && isError) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 text-center">
        <Text variant="h2" className="mb-2">
          That record isn’t in this church
        </Text>
        <Link to="/staff/members">
          <Button variant="secondary">Back to the directory</Button>
        </Link>
      </div>
    );
  }

  if (id && (isLoading || !member)) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 xl:px-8 py-8 animate-fade-in">
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid gap-8 2xl:grid-cols-[16rem_minmax(0,1fr)]">
          <Skeleton className="hidden 2xl:block h-80 rounded-xl" />
          <Skeleton className="h-[28rem] rounded-xl" />
        </div>
      </div>
    );
  }

  return <RegistrationWizard key={id ?? 'new'} member={member} />;
}

function RegistrationWizard({ member }: { member?: MemberDetail }) {
  const isEditing = Boolean(member);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [restoredDraft] = useState<FormState | null>(() => (isEditing ? null : readDraft()));
  const [form, setForm] = useState<FormState>(() => (member ? formFromMember(member) : (restoredDraft ?? emptyForm())));
  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(isEditing ? STEPS.length - 1 : 0);
  const [attempted, setAttempted] = useState<Set<StepId>>(new Set());
  const [showDraftBanner, setShowDraftBanner] = useState(Boolean(restoredDraft));
  const formTopRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];

  // Keep an unfinished registration as a draft, so stepping away loses nothing.
  useEffect(() => {
    if (isEditing) return;
    try {
      window.localStorage.setItem(DRAFT_PREFIX + currentTenantId(), JSON.stringify(form));
    } catch {
      // Drafts are a convenience; without storage the form still works.
    }
  }, [form, isEditing]);

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: () => groupsService.list() });
  const { data: households = [] } = useQuery({ queryKey: ['households'], queryFn: () => membersService.listHouseholds() });
  const { data: roster = [] } = useQuery({ queryKey: ['members', 'roster'], queryFn: () => membersService.list() });
  const { data: suggestedEnvelope } = useQuery({
    queryKey: ['members', 'next-envelope'],
    queryFn: () => membersService.suggestEnvelopeNumber(),
    enabled: !isEditing,
  });

  const takenEnvelopes = useMemo(
    () => new Set(roster.filter((m) => m.id !== member?.id && m.envelopeNumber).map((m) => m.envelopeNumber!)),
    [roster, member?.id],
  );

  // Duplicates are checked against what has been entered on steps already
  // passed — the name after Identity, phone/email after Contact — so the check
  // runs once per step, not on every keystroke.
  const pastIdentity = stepIndex > 0;
  const pastContact = stepIndex > 1;
  const probeFirst = pastIdentity ? form.firstName.trim() : '';
  const probeLast = pastIdentity ? form.lastName.trim() : '';
  const probePhone = pastContact ? form.phone.trim() : '';
  const probeEmail = pastContact ? form.email.trim() : '';
  const probe = useMemo(
    () => ({ firstName: probeFirst, lastName: probeLast, phone: probePhone, email: probeEmail, excludeId: member?.id }),
    [probeFirst, probeLast, probePhone, probeEmail, member?.id],
  );
  const { data: duplicates = [] } = useQuery({
    queryKey: ['members', 'duplicates', probe],
    queryFn: () => membersService.findDuplicates(probe),
    enabled: stepIndex > 0 && Boolean(probe.firstName || probe.phone || probe.email),
  });

  const ctx = { takenEnvelopes, hasDuplicates: duplicates.length > 0, isEditing };
  const errors: Errors = attempted.has(step.id) ? validateStep(step.id, form, ctx) : {};
  const minor = isMinor(form);
  const age = ageFrom(form.dateOfBirth);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goTo(index: number) {
    setStepIndex(index);
    setFurthest((f) => Math.max(f, index));
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Marks a step as attempted and reports whether it passes. */
  function check(id: StepId): boolean {
    setAttempted((prev) => new Set(prev).add(id));
    return Object.keys(validateStep(id, form, ctx)).length === 0;
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-registration] [aria-invalid="true"]')?.focus();
    });
  }

  function next() {
    if (!check(step.id)) return focusFirstError();
    goTo(stepIndex + 1);
  }

  function skip() {
    // Skipping discards what was half-entered on this step rather than saving it unchecked.
    setForm((prev) => ({
      ...prev,
      householdMode: 'none',
      householdName: '',
      householdId: '',
      householdRole: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: '',
    }));
    goTo(stepIndex + 1);
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = toPayload(form, { isEditing, existingConsentAt: member?.consent?.dataProcessingAt });
      if (member) {
        const { groupIds: _groupIds, ...update } = payload;
        return membersService.update(member.id, update);
      }
      return membersService.register(payload);
    },
    onSuccess: async (saved) => {
      clearDraft();
      queryClient.setQueryData(['member', saved.id], saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['households'] }),
        queryClient.invalidateQueries({ queryKey: ['household'] }),
      ]);
      navigate(`/staff/members/${saved.id}`, { state: { justSaved: isEditing ? 'updated' : 'registered' } });
    },
  });

  function submit() {
    // Every step is re-checked on save; the first one with a problem is opened.
    const failing = STEPS.findIndex((s) => Object.keys(validateStep(s.id, form, ctx)).length > 0);
    setAttempted(new Set(STEPS.map((s) => s.id)));
    if (failing !== -1) {
      goTo(failing);
      return focusFirstError();
    }
    save.mutate();
  }

  function discardDraft() {
    clearDraft();
    setForm(emptyForm());
    setAttempted(new Set());
    setShowDraftBanner(false);
    setStepIndex(0);
    setFurthest(0);
  }

  const stepState = (index: number): 'done' | 'current' | 'error' | 'todo' => {
    if (index === stepIndex) return 'current';
    const s = STEPS[index];
    if (attempted.has(s.id) && Object.keys(validateStep(s.id, form, ctx)).length > 0) return 'error';
    return index <= furthest && (attempted.has(s.id) || isEditing) ? 'done' : 'todo';
  };

  const percent = Math.round(completeness(form) * 100);
  const displayName = [form.firstName, form.lastName].filter((v) => v.trim()).join(' ');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 xl:px-8 py-6 xl:py-8 animate-fade-in" data-registration>
      <Link
        to={member ? `/staff/members/${member.id}` : '/staff/members'}
        className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft size={16} aria-hidden /> {member ? 'Back to profile' : 'Back to directory'}
      </Link>

      <header className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Text variant="h1" className="mb-1 xl:text-display">
            {isEditing ? `Edit ${member!.firstName} ${member!.lastName}` : 'Register a member'}
          </Text>
          <Text variant="body" color="muted">
            {isEditing
              ? 'Change any section, then save. Nothing is lost by moving between steps.'
              : 'Fields marked * are required. Everything else can be skipped and added later.'}
          </Text>
        </div>
        {isEditing && (
          <Button variant="primary" leftIcon={Check} isLoading={save.isPending} onClick={submit} className="hidden xl:inline-flex">
            Save changes
          </Button>
        )}
      </header>

      {showDraftBanner && (
        <Card accent="primary" padding="sm" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Text variant="body-sm">
            We kept the registration you hadn’t finished{displayName ? ` for ${displayName}` : ''}.
          </Text>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={RotateCcw} onClick={discardDraft}>
              Start over
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDraftBanner(false)}>
              Continue it
            </Button>
          </div>
        </Card>
      )}

      <div ref={formTopRef} className="grid gap-6 xl:gap-8 2xl:grid-cols-[16rem_minmax(0,1fr)] scroll-mt-6">
        {/* ── Step rail (desktop) ───────────────────────────────── */}
        <aside className="hidden 2xl:block">
          <div className="sticky top-6 space-y-5">
            <nav aria-label="Registration steps">
              <ol className="space-y-1">
                {STEPS.map((s, index) => {
                  const state = stepState(index);
                  const reachable = isEditing || index <= furthest;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!reachable}
                        aria-current={state === 'current' ? 'step' : undefined}
                        onClick={() => goTo(index)}
                        className={cn(
                          'w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          state === 'current' ? 'bg-primary-light/70 dark:bg-primary/15' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                          !reachable && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                            state === 'current' && 'bg-primary text-white',
                            state === 'done' && 'bg-success-light text-success',
                            state === 'error' && 'bg-danger-light text-danger',
                            state === 'todo' && 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                          )}
                        >
                          {state === 'done' ? <Check size={14} aria-hidden /> : state === 'error' ? <CircleAlert size={14} aria-hidden /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Text variant="body" className={cn('font-semibold', state === 'current' && 'text-primary')}>
                              {s.title}
                            </Text>
                            {s.optional && (
                              <Badge size="sm" variant="neutral">
                                Optional
                              </Badge>
                            )}
                          </span>
                          <Text variant="caption" color="muted" className="block">
                            {state === 'error' ? 'Needs attention' : s.summary}
                          </Text>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <Card variant="flat" padding="sm">
              <div className="flex items-center justify-between mb-2">
                <Text variant="label" color="muted">
                  Profile detail
                </Text>
                <Text variant="caption" className="tabular-nums font-semibold">
                  {percent}%
                </Text>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
              <Text variant="caption" color="muted" className="block mt-2">
                A fuller record helps pastoral care, but only the starred fields are needed to save.
              </Text>
            </Card>
          </div>
        </aside>

        {/* ── The step itself ───────────────────────────────────── */}
        <div className="min-w-0">
          {/* Phone: progress instead of the rail */}
          <div className="2xl:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <Text variant="label" color="primary">
                Step {stepIndex + 1} of {STEPS.length}
              </Text>
              {step.optional && <Badge size="sm">Optional</Badge>}
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <div key={s.id} className={cn('h-1.5 flex-1 rounded-full', i <= stepIndex ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700')} />
              ))}
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 xl:px-7 py-4 xl:py-5">
              <Text variant="label" color="primary" className="hidden 2xl:block mb-1">
                Step {stepIndex + 1} of {STEPS.length}
              </Text>
              <Text variant="h2">{step.title}</Text>
            </div>

            <div className="px-5 xl:px-7 py-5 xl:py-6 space-y-6">
              {duplicates.length > 0 && stepIndex > 0 && (
                <DuplicateWarning duplicates={duplicates} />
              )}

              {step.id === 'identity' && (
                <>
                  <Section title="Photo">
                    <div className="sm:col-span-2 flex items-center gap-4">
                      <Avatar src={form.photoUrl || undefined} name={displayName || '?'} size="xl" />
                      <div className="space-y-2">
                        <MediaPicker kind="image" label={form.photoUrl ? 'Replace photo' : 'Add a photo'} onSelect={(asset) => set('photoUrl', asset.url)} />
                        {form.photoUrl && (
                          <Button variant="link" size="sm" onClick={() => set('photoUrl', '')}>
                            Remove photo
                          </Button>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section title="Name">
                    <Select
                      label="Title"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      options={[{ value: '', label: 'None' }, ...TITLE_OPTIONS.map((t) => ({ value: t, label: t }))]}
                    />
                    <Input label="Preferred name" placeholder="What they like to be called" value={form.preferredName} onChange={(e) => set('preferredName', e.target.value)} />
                    <Input
                      label="First name *"
                      autoFocus={!isEditing}
                      autoComplete="off"
                      aria-required
                      value={form.firstName}
                      error={errors.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                    />
                    <Input label="Middle name" autoComplete="off" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
                    <Input
                      label="Last name *"
                      autoComplete="off"
                      aria-required
                      value={form.lastName}
                      error={errors.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      className="sm:col-span-2"
                    />
                  </Section>

                  <Section title="About them">
                    <ChoiceGroup
                      label="Gender *"
                      value={form.gender}
                      error={errors.gender}
                      onChange={(value) => set('gender', value)}
                      options={options(GENDER_LABELS)}
                    />
                    <Input
                      label="Date of birth"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.dateOfBirth}
                      error={errors.dateOfBirth}
                      onChange={(e) => set('dateOfBirth', e.target.value)}
                    />
                    <Select label="Marital status" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value as FormState['maritalStatus'])} options={options(MARITAL_LABELS, 'Not recorded')} />
                    {age !== null && (
                      <Text variant="caption" color="muted" className="self-end pb-3">
                        {age} years old{minor ? ' — a parent or guardian will need to give consent.' : ''}
                      </Text>
                    )}
                    <Input label="Occupation" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
                    <Input label="Employer or school" value={form.employer} onChange={(e) => set('employer', e.target.value)} />
                  </Section>
                </>
              )}

              {step.id === 'contact' && (
                <>
                  <Section title="Reaching them" hint="At least one of phone or email is required.">
                    <Input
                      label="Mobile phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="+250 7xx xxx xxx"
                      value={form.phone}
                      error={errors.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      value={form.email}
                      error={errors.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                    <div className="space-y-3">
                      <Checkbox
                        label="WhatsApp is on the same number"
                        checked={form.whatsappSameAsPhone}
                        onChange={(e) => set('whatsappSameAsPhone', e.target.checked)}
                      />
                      {!form.whatsappSameAsPhone && (
                        <Input label="WhatsApp number" type="tel" inputMode="tel" value={form.whatsapp} error={errors.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
                      )}
                    </div>
                    <Select
                      label="Best way to reach them"
                      value={form.preferredContact}
                      onChange={(e) => set('preferredContact', e.target.value as FormState['preferredContact'])}
                      options={options(CONTACT_CHANNEL_LABELS, 'No preference')}
                    />
                  </Section>

                  <Section title="Home address">
                    <Input label="Street address" value={form.addressLine1} error={errors.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className="sm:col-span-2" />
                    <Input label="Apartment, estate or landmark" value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className="sm:col-span-2" />
                    <Input label="Town or city" value={form.city} error={errors.city} onChange={(e) => set('city', e.target.value)} />
                    <Input label="District, state or province" value={form.state} onChange={(e) => set('state', e.target.value)} />
                    <Input label="Postal code" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
                    <Input label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
                  </Section>
                </>
              )}

              {step.id === 'church' && (
                <>
                  <Section title="Membership">
                    <Select
                      label="Status *"
                      value={form.status}
                      error={errors.status}
                      onChange={(e) => set('status', e.target.value as FormState['status'])}
                      options={options(STATUS_LABELS)}
                    />
                    <Select
                      label="Unit / branch"
                      value={form.unitId}
                      onChange={(e) => set('unitId', e.target.value)}
                      options={[{ value: '', label: 'Not assigned yet' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
                    />
                    <Input label="Joined on" type="date" max={new Date().toISOString().slice(0, 10)} value={form.joinedAt} error={errors.joinedAt} onChange={(e) => set('joinedAt', e.target.value)} />
                    <Select label="How they joined" value={form.joinMethod} onChange={(e) => set('joinMethod', e.target.value as FormState['joinMethod'])} options={options(JOIN_METHOD_LABELS, 'Not recorded')} />
                    {form.joinMethod === 'transfer' && (
                      <Input label="Previous church" value={form.previousChurch} onChange={(e) => set('previousChurch', e.target.value)} />
                    )}
                    <Input label="Invited by" placeholder="Who brought them, if anyone" value={form.invitedBy} onChange={(e) => set('invitedBy', e.target.value)} />
                  </Section>

                  <Section title="Faith & giving">
                    <ChoiceGroup
                      label="Baptised?"
                      value={form.isBaptised}
                      onChange={(value) => set('isBaptised', value)}
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'Not yet' },
                      ]}
                    />
                    {form.isBaptised === 'yes' ? (
                      <Input label="Baptism date" type="date" value={form.baptismDate} error={errors.baptismDate} onChange={(e) => set('baptismDate', e.target.value)} />
                    ) : (
                      <div className="hidden sm:block" />
                    )}
                    <div className="space-y-1.5">
                      <Input
                        label="Envelope number"
                        inputMode="numeric"
                        value={form.envelopeNumber}
                        error={errors.envelopeNumber}
                        onChange={(e) => set('envelopeNumber', e.target.value)}
                      />
                      {!form.envelopeNumber && suggestedEnvelope && (
                        <Button variant="link" size="sm" onClick={() => set('envelopeNumber', suggestedEnvelope)}>
                          Use the next free number, #{suggestedEnvelope}
                        </Button>
                      )}
                    </div>
                    <Text variant="caption" color="muted" className="self-center">
                      An envelope number lets the counting team credit giving without searching by name.
                    </Text>
                  </Section>

                  {isEditing ? (
                    <Section title="Groups">
                      <Text variant="body-sm" color="muted" className="sm:col-span-2">
                        Group memberships and roles are managed from {member!.firstName}’s profile or from each group’s page.
                      </Text>
                    </Section>
                  ) : (
                    <Section title="Groups" hint="They join as a member; roles can be changed on the group’s page.">
                      {groups.length === 0 ? (
                        <Text variant="body-sm" color="muted" className="sm:col-span-2">
                          This church has no groups yet. <Link to="/staff/groups/new" className="text-primary underline">Create one</Link>.
                        </Text>
                      ) : (
                        <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3" role="group" aria-label="Groups to join">
                          {groups.map((group) => {
                            const selected = form.groupIds.includes(group.id);
                            return (
                              <button
                                key={group.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  set('groupIds', selected ? form.groupIds.filter((g) => g !== group.id) : [...form.groupIds, group.id])
                                }
                                className={cn(
                                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                                  selected
                                    ? 'border-primary bg-primary-light/50 dark:bg-primary/15'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/40',
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                                    selected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600',
                                  )}
                                  aria-hidden
                                >
                                  {selected && <Check size={12} />}
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} aria-hidden />
                                    <Text variant="body-sm" className="font-semibold truncate">
                                      {group.name}
                                    </Text>
                                  </span>
                                  <Text variant="caption" color="muted" className="block truncate">
                                    {GROUP_TYPE_LABELS[group.type]}
                                    {formatSchedule(group.schedule) ? ` · ${formatSchedule(group.schedule)}` : ''}
                                  </Text>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Section>
                  )}
                </>
              )}

              {step.id === 'family' && (
                <>
                  {minor && (
                    <Card accent="warning" padding="sm">
                      <Text variant="body-sm">
                        {form.firstName || 'They'} {form.firstName ? 'is' : 'are'} under 18. Link them to their parents’ household and add a parent or guardian as the emergency contact.
                      </Text>
                    </Card>
                  )}

                  <Section title="Household">
                    <div className="sm:col-span-2">
                      <ChoiceGroup
                        label="Do they live with other people in the church?"
                        value={form.householdMode}
                        onChange={(mode) =>
                          setForm((prev) => ({
                            ...prev,
                            householdMode: mode,
                            householdName:
                              mode === 'new' && !prev.householdName && prev.lastName.trim()
                                ? `The ${prev.lastName.trim()} Household`
                                : prev.householdName,
                            householdRole: mode === 'new' && !prev.householdRole ? 'head' : prev.householdRole,
                          }))
                        }
                        options={[
                          { value: 'none', label: 'No household' },
                          { value: 'new', label: 'Start a new household' },
                          { value: 'existing', label: 'Join an existing one' },
                        ]}
                      />
                    </div>
                    {form.householdMode === 'new' && (
                      <Input label="Household name *" value={form.householdName} error={errors.householdName} onChange={(e) => set('householdName', e.target.value)} />
                    )}
                    {form.householdMode === 'existing' && (
                      <Select
                        label="Household *"
                        value={form.householdId}
                        error={errors.householdId}
                        onChange={(e) => set('householdId', e.target.value)}
                        options={[
                          { value: '', label: households.length ? 'Choose a household' : 'No households yet' },
                          ...households.map((h) => ({
                            value: h.id,
                            label: `${h.name}${h.members.length ? ` (${h.members.map((m) => m.firstName).join(', ')})` : ''}`,
                          })),
                        ]}
                      />
                    )}
                    {form.householdMode !== 'none' && (
                      <Select
                        label="Their place in it *"
                        value={form.householdRole}
                        error={errors.householdRole}
                        onChange={(e) => set('householdRole', e.target.value as FormState['householdRole'])}
                        options={options(HOUSEHOLD_ROLE_LABELS, 'Choose one')}
                      />
                    )}
                  </Section>

                  <Section title={minor ? 'Parent or guardian / emergency contact' : 'Emergency contact'}>
                    <Input label="Name" value={form.emergencyName} error={errors.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} />
                    <Input label="Phone" type="tel" inputMode="tel" value={form.emergencyPhone} error={errors.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} />
                    <Input label="Relationship" placeholder={minor ? 'Mother, father, guardian…' : 'Spouse, sibling, friend…'} value={form.emergencyRelationship} onChange={(e) => set('emergencyRelationship', e.target.value)} />
                  </Section>
                </>
              )}

              {step.id === 'review' && (
                <>
                  <div className="grid gap-4 2xl:grid-cols-2">
                    <ReviewBlock title="Identity" onEdit={() => goTo(0)}>
                      <ReviewRow label="Name" value={[form.title, form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')} />
                      <ReviewRow label="Preferred name" value={form.preferredName} />
                      <ReviewRow label="Gender" value={form.gender ? GENDER_LABELS[form.gender] : ''} />
                      <ReviewRow label="Date of birth" value={form.dateOfBirth ? `${formatDate(form.dateOfBirth)}${age !== null ? ` (${age})` : ''}` : ''} />
                      <ReviewRow label="Marital status" value={form.maritalStatus ? MARITAL_LABELS[form.maritalStatus] : ''} />
                      <ReviewRow label="Occupation" value={[form.occupation, form.employer].filter(Boolean).join(' · ')} />
                    </ReviewBlock>
                    <ReviewBlock title="Contact" onEdit={() => goTo(1)}>
                      <ReviewRow label="Phone" value={form.phone} />
                      <ReviewRow label="WhatsApp" value={form.whatsappSameAsPhone ? (form.phone ? 'Same number' : '') : form.whatsapp} />
                      <ReviewRow label="Email" value={form.email} />
                      <ReviewRow label="Prefers" value={form.preferredContact ? CONTACT_CHANNEL_LABELS[form.preferredContact] : ''} />
                      <ReviewRow label="Address" value={[form.addressLine1, form.addressLine2, form.city, form.state, form.postalCode, form.country].filter(Boolean).join(', ')} />
                    </ReviewBlock>
                    <ReviewBlock title="Church life" onEdit={() => goTo(2)}>
                      <ReviewRow label="Status" value={STATUS_LABELS[form.status]} />
                      <ReviewRow label="Unit" value={units.find((u) => u.id === form.unitId)?.name ?? ''} />
                      <ReviewRow label="Joined" value={[form.joinedAt ? formatDate(form.joinedAt) : '', form.joinMethod ? JOIN_METHOD_LABELS[form.joinMethod] : ''].filter(Boolean).join(' · ')} />
                      <ReviewRow label="Baptised" value={form.isBaptised === 'yes' ? `Yes${form.baptismDate ? `, ${formatDate(form.baptismDate)}` : ''}` : form.isBaptised === 'no' ? 'Not yet' : ''} />
                      <ReviewRow label="Envelope" value={form.envelopeNumber ? `#${form.envelopeNumber}` : ''} />
                      {!isEditing && (
                        <ReviewRow label="Groups" value={groups.filter((g) => form.groupIds.includes(g.id)).map((g) => g.name).join(', ')} />
                      )}
                    </ReviewBlock>
                    <ReviewBlock title="Family" onEdit={() => goTo(3)}>
                      <ReviewRow
                        label="Household"
                        value={
                          form.householdMode === 'new'
                            ? `${form.householdName} (new)`
                            : form.householdMode === 'existing'
                              ? households.find((h) => h.id === form.householdId)?.name ?? ''
                              : ''
                        }
                      />
                      <ReviewRow label="Role" value={form.householdMode !== 'none' && form.householdRole ? HOUSEHOLD_ROLE_LABELS[form.householdRole] : ''} />
                      <ReviewRow label="Emergency" value={[form.emergencyName, form.emergencyRelationship, form.emergencyPhone].filter(Boolean).join(' · ')} />
                    </ReviewBlock>
                  </div>

                  <Section title="Consent">
                    <div className="sm:col-span-2 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" aria-hidden />
                        <Text variant="body-sm" color="muted">
                          Church membership records reveal religious belief, which data-protection law treats as sensitive. Explain to{' '}
                          {minor ? 'their parent or guardian' : 'them'} what the church keeps and why, and record their agreement here.
                        </Text>
                      </div>
                      {isEditing && member?.consent ? (
                        <Text variant="body-sm">
                          Consent recorded {formatDate(member.consent.dataProcessingAt)}
                          {member.consent.givenBy === 'guardian' ? ' by a parent or guardian' : ''}.
                        </Text>
                      ) : (
                        <Checkbox
                          label={minor ? 'A parent or guardian agrees to the church keeping this record *' : 'They agree to the church keeping this record *'}
                          description="Used for pastoral care, church administration and giving records. Never shared outside the church."
                          checked={form.consentData}
                          error={errors.consentData}
                          onChange={(e) => set('consentData', e.target.checked)}
                        />
                      )}
                      {isEditing && !member?.consent && (
                        <Text variant="caption" className="block text-warning">
                          No consent is on file for this person yet. Record it when you next speak with them.
                        </Text>
                      )}
                      <Checkbox
                        label="Send them church announcements and messages"
                        description="Email, SMS or WhatsApp. They can opt out at any time."
                        checked={form.consentCommunications}
                        onChange={(e) => set('consentCommunications', e.target.checked)}
                      />
                      <Checkbox
                        label="List them in the member directory"
                        description="Other members can see their name, photo and groups in the portal."
                        checked={form.directoryVisible}
                        onChange={(e) => set('directoryVisible', e.target.checked)}
                      />
                    </div>
                  </Section>

                  {duplicates.length > 0 && (
                    <Checkbox
                      label="I’ve checked — this is a different person"
                      checked={form.confirmedNotDuplicate}
                      error={errors.confirmedNotDuplicate}
                      onChange={(e) => set('confirmedNotDuplicate', e.target.checked)}
                    />
                  )}

                  <Section title="Notes">
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label htmlFor="registration-notes" className="text-label text-slate-700 dark:text-slate-300">
                        Anything else to keep on file
                      </label>
                      <textarea
                        id="registration-notes"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="Visible to staff. Use pastoral notes on the profile for anything confidential."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </Section>
                </>
              )}

              {save.isError && (
                <Card accent="danger" padding="sm" role="alert">
                  <Text variant="body-sm">{save.error instanceof Error ? save.error.message : 'Saving failed. Try again.'}</Text>
                </Card>
              )}
            </div>

            {/* ── Footer actions ─────────────────────────────── */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-5 xl:px-7 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              {stepIndex > 0 ? (
                <Button variant="ghost" leftIcon={ArrowLeft} onClick={() => goTo(stepIndex - 1)}>
                  Back
                </Button>
              ) : (
                <Link to={member ? `/staff/members/${member.id}` : '/staff/members'}>
                  <Button variant="ghost" fullWidth>
                    Cancel
                  </Button>
                </Link>
              )}

              <div className="sm:flex-1" />

              {isEditing && stepIndex < STEPS.length - 1 && (
                <Button variant="secondary" leftIcon={Check} isLoading={save.isPending} onClick={submit}>
                  Save changes
                </Button>
              )}
              {step.optional && !isEditing && (
                <Button variant="secondary" rightIcon={SkipForward} onClick={skip}>
                  Skip this step
                </Button>
              )}
              {stepIndex < STEPS.length - 1 ? (
                <Button variant="primary" rightIcon={ArrowRight} onClick={next} className="sm:min-w-40">
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  leftIcon={isEditing ? Check : UserPlus}
                  isLoading={save.isPending}
                  onClick={submit}
                  className="sm:min-w-44"
                >
                  {isEditing ? 'Save changes' : 'Register member'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <Text variant="h3">{title}</Text>
        {hint && (
          <Text variant="caption" color="muted" className="block mt-0.5">
            {hint}
          </Text>
        )}
      </div>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A small set of mutually exclusive choices as buttons — quicker than a select for two or three options. */
function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options: choices,
  error,
}: {
  label: string;
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-invalid={Boolean(error)}>
      <legend className="text-label text-slate-700 dark:text-slate-300 mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {choices.map((choice, index) => {
          const selected = value === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              // The first option takes focus when this group is the first error.
              aria-invalid={index === 0 && Boolean(error) ? true : undefined}
              onClick={() => onChange(choice.value)}
              className={cn(
                'h-11 rounded-lg border px-4 text-body transition-colors',
                selected
                  ? 'border-primary bg-primary-light/60 text-primary font-semibold dark:bg-primary/15'
                  : error
                    ? 'border-danger text-slate-700 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/40',
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {error && (
        <span className="text-caption text-danger" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <Text variant="label" color="muted">
          {title}
        </Text>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline">
          <Pencil size={12} aria-hidden /> Edit
        </button>
      </div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-body-sm text-slate-500 shrink-0">{label}</dt>
      <dd className={cn('text-body-sm text-right min-w-0 break-words', value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400')}>
        {value || 'Skipped'}
      </dd>
    </div>
  );
}

function DuplicateWarning({ duplicates }: { duplicates: Awaited<ReturnType<typeof membersService.findDuplicates>> }) {
  const REASON: Record<string, string> = { name: 'same name', phone: 'same phone', email: 'same email' };
  return (
    <Card accent="warning" padding="sm" role="status">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <Text variant="body-sm" className="font-semibold">
            {duplicates.length === 1 ? 'Someone like this is already registered' : `${duplicates.length} similar people are already registered`}
          </Text>
          <Text variant="caption" color="muted" className="block mb-2">
            Your progress is saved — check before creating a second record.
          </Text>
          <ul className="space-y-1.5">
            {duplicates.map(({ member, reasons }) => (
              <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Avatar src={member.photoUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                <Text variant="body-sm" className="font-medium">
                  {member.firstName} {member.lastName}
                </Text>
                <Text variant="caption" color="muted">
                  {reasons.map((r) => REASON[r]).join(', ')}
                  {member.householdId ? ' · has a household' : ''}
                </Text>
                <Link to={`/staff/members/${member.id}`} className="text-caption text-primary font-semibold">
                  Open record
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
