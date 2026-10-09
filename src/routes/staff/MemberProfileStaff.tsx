/**
 * @file MemberProfileStaff.tsx
 * @description The page a pastor lives on (US-024).
 *
 * On desktop the record reads like a file on a desk: a banner with who this
 * is and the ways to reach them, then two columns — the standing facts down
 * the left (contact, family, groups, personal details), the history a pastor
 * reads through on the right, behind underline tabs. On a phone the same
 * pieces stack: hero, tabs, then the facts.
 *
 * Pastoral notes are behind a permission check rather than merely hidden,
 * because "confidential" that is only a CSS class is not confidential.
 */
import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Edit,
  Hash,
  Home,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  ShieldAlert,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import type { GroupRole } from '@/types';
import { membersService } from '@/services/membersService';
import { groupsService } from '@/services/groupsService';
import { certificatesService } from '@/services/certificatesService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Badge, Button, Card, SegmentedControl, Select, Skeleton, StatTile, Text } from '@/components/ui';
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/formatters';
import {
  CONTACT_CHANNEL_LABELS,
  GENDER_LABELS,
  GROUP_ROLE_LABELS,
  GROUP_TYPE_LABELS,
  HOUSEHOLD_ROLE_LABELS,
  JOIN_METHOD_LABELS,
  MARITAL_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  ageFrom,
  formatSchedule,
} from '@/lib/people';
import { cn } from '@/lib/cn';

type Tab = 'overview' | 'groups' | 'attendance' | 'giving' | 'sacraments' | 'notes';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'groups', label: 'Groups' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'giving', label: 'Giving' },
  { value: 'sacraments', label: 'Sacraments' },
  { value: 'notes', label: 'Notes' },
];

export function MemberProfileStaff() {
  const { id = '' } = useParams();
  const { can } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const justSaved = (location.state as { justSaved?: 'registered' | 'updated' } | null)?.justSaved;

  const { data: member, isLoading, isError } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersService.getById(id),
    enabled: Boolean(id),
  });

  const { data: household } = useQuery({
    queryKey: ['household', member?.householdId],
    queryFn: () => membersService.getHousehold(member!.householdId!),
    enabled: Boolean(member?.householdId),
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.list(),
    enabled: can('groups:read'),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['member', id, 'notes'],
    queryFn: () => membersService.getPastoralNotes(id),
    enabled: Boolean(id) && can('pastoral_notes:read'),
  });

  const { data: sacraments = [] } = useQuery({
    queryKey: ['member', id, 'sacraments'],
    queryFn: () => membersService.getSacramentalRecords(id),
    enabled: Boolean(id),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', id],
    queryFn: () => certificatesService.listIssued(id),
    enabled: Boolean(id),
  });

  const refreshGroups = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member', id] }),
      queryClient.invalidateQueries({ queryKey: ['members'] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['group'] }),
    ]);

  const joinGroup = useMutation({
    mutationFn: ({ groupId, role }: { groupId: string; role: GroupRole }) => groupsService.addMembers(groupId, [id], role),
    onSuccess: refreshGroups,
  });

  const leaveGroup = useMutation({
    mutationFn: (groupId: string) => groupsService.removeMember(groupId, id),
    onSuccess: refreshGroups,
  });

  if (isError) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <Text variant="h2" className="mb-2">
          This person isn’t in your church’s directory
        </Text>
        <Text variant="body" color="muted" className="mb-6">
          The record may have been removed, or belongs to a different church.
        </Text>
        <Link to="/staff/members">
          <Button variant="secondary">Back to the directory</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !member) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 animate-fade-in space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${member.firstName} ${member.lastName}`;
  const age = ageFrom(member.dateOfBirth);
  const groups = member.groups ?? [];
  const joinableGroups = allGroups.filter((g) => !groups.some((mg) => mg.id === g.id));
  const whatsapp = (member.whatsapp ?? member.phone)?.replace(/\D/g, '');
  const groupById = new Map(allGroups.map((g) => [g.id, g]));

  // ── Hero ────────────────────────────────────────────────────────────────
  const hero = (
    <Card padding="none" className="overflow-hidden">
      <div className="h-20 xl:h-28 bg-gradient-to-r from-primary-light via-primary-light/60 to-transparent dark:from-primary/25 dark:via-primary/10" aria-hidden />
      <div className="px-5 xl:px-8 pb-5 xl:pb-0">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between -mt-10 xl:-mt-14">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-5 min-w-0">
            <div className="rounded-full ring-4 ring-surface dark:ring-surface-dark w-fit bg-surface dark:bg-surface-dark">
              <Avatar src={member.photoUrl} name={fullName} size="xl" className="xl:size-28 xl:text-2xl" />
            </div>
            <div className="min-w-0 xl:pb-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Text variant="display" as="h1" className="min-w-0">
                  {member.title ? `${member.title} ` : ''}
                  {fullName}
                </Text>
                <Badge variant={STATUS_BADGE[member.status]} dot className="shrink-0">
                  {STATUS_LABELS[member.status]}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-slate-500">
                {member.preferredName && <span>Goes by {member.preferredName}</span>}
                {member.envelopeNumber && (
                  <span className="inline-flex items-center gap-1">
                    <Hash size={14} aria-hidden /> Envelope {member.envelopeNumber}
                  </span>
                )}
                {member.joinedAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} aria-hidden /> Joined {formatDate(member.joinedAt)}
                  </span>
                )}
                {member.unitName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} aria-hidden /> {member.unitName}
                  </span>
                )}
                {member.lastSeenAt && <span>Last seen {formatRelative(member.lastSeenAt)}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 2xl:pb-2 shrink-0">
            {member.phone && (
              <a href={`tel:${member.phone}`}>
                <Button variant="primary" size="sm" leftIcon={Phone}>
                  Call
                </Button>
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm" leftIcon={MessageCircle}>
                  WhatsApp
                </Button>
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`}>
                <Button variant="secondary" size="sm" leftIcon={Mail}>
                  Email
                </Button>
              </a>
            )}
            {can('members:update') && (
              <Link to={`/staff/members/${member.id}/edit`}>
                <Button variant="ghost" size="sm" leftIcon={Edit}>
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Desktop: underline tabs attached to the banner */}
        <div className="hidden xl:flex gap-1 mt-6 -mb-px" role="tablist" aria-label="Member record">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-4 py-3 text-body font-semibold border-b-2 transition-colors',
                tab === t.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {t.label}
              {t.value === 'groups' && groups.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 text-caption tabular-nums">{groups.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );

  // ── Left column: standing facts ────────────────────────────────────────
  const contactCard = (
    <Card padding="md">
      <SideHeading>Contact</SideHeading>
      {!member.phone && !member.email && !member.address && (
        <Text variant="body-sm" color="muted">
          No contact info on file.
        </Text>
      )}
      <dl className="space-y-3">
        {member.phone && <Fact icon={Phone} label="Mobile" value={<a href={`tel:${member.phone}`} className="hover:text-primary">{member.phone}</a>} />}
        {member.whatsapp && member.whatsapp !== member.phone && <Fact icon={MessageCircle} label="WhatsApp" value={member.whatsapp} />}
        {member.email && (
          <Fact icon={Mail} label="Email" value={<a href={`mailto:${member.email}`} className="hover:text-primary break-all">{member.email}</a>} />
        )}
        {member.address && (
          <Fact
            icon={MapPin}
            label="Home"
            value={
              <>
                {member.address.line1}
                {member.address.line2 ? <><br />{member.address.line2}</> : null}
                <br />
                {[member.address.city, member.address.state, member.address.postalCode].filter(Boolean).join(', ')}
                {member.address.country ? <><br />{member.address.country}</> : null}
              </>
            }
          />
        )}
      </dl>
      {member.preferredContact && (
        <Text variant="caption" color="muted" className="block mt-3">
          Prefers {CONTACT_CHANNEL_LABELS[member.preferredContact].toLowerCase()}.
        </Text>
      )}
    </Card>
  );

  const familyCard = (
    <Card padding="md">
      <SideHeading
        action={
          household ? (
            <Link to={`/staff/households/${household.id}`} className="text-caption font-semibold text-primary">
              Open
            </Link>
          ) : null
        }
      >
        Family
      </SideHeading>
      {household ? (
        <>
          <Text variant="body-sm" className="font-semibold mb-2 flex items-center gap-2">
            <Home size={14} className="text-slate-400" aria-hidden /> {household.name}
          </Text>
          <ul className="space-y-2">
            {household.members
              .filter((m) => m.id !== member.id)
              .map((relative) => (
                <li key={relative.id}>
                  <Link to={`/staff/members/${relative.id}`} className="flex items-center gap-3 group">
                    <Avatar src={relative.photoUrl} name={`${relative.firstName} ${relative.lastName}`} size="sm" />
                    <Text variant="body-sm" className="group-hover:text-primary truncate">
                      {relative.firstName} {relative.lastName}
                    </Text>
                  </Link>
                </li>
              ))}
          </ul>
          {household.members.length <= 1 && (
            <Text variant="caption" color="muted">
              No one else in this household yet.
            </Text>
          )}
        </>
      ) : (
        <Text variant="body-sm" color="muted">
          Not linked to a household.{' '}
          {can('members:update') && (
            <Link to={`/staff/members/${member.id}/edit`} className="text-primary font-semibold">
              Link one
            </Link>
          )}
        </Text>
      )}
      {member.emergencyContact && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Text variant="label" color="muted" className="block mb-1">
            Emergency contact
          </Text>
          <Text variant="body-sm" className="font-medium">
            {member.emergencyContact.name}
            {member.emergencyContact.relationship ? ` · ${member.emergencyContact.relationship}` : ''}
          </Text>
          <a href={`tel:${member.emergencyContact.phone}`} className="text-body-sm text-primary">
            {member.emergencyContact.phone}
          </a>
        </div>
      )}
    </Card>
  );

  const groupsCard = can('groups:read') && (
    <Card padding="md">
      <SideHeading
        action={
          <button type="button" onClick={() => setTab('groups')} className="text-caption font-semibold text-primary">
            Manage
          </button>
        }
      >
        Groups
      </SideHeading>
      {groups.length === 0 ? (
        <Text variant="body-sm" color="muted">
          Not in any group yet.
        </Text>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/staff/groups/${group.id}`} className="flex items-center justify-between gap-2 group">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} aria-hidden />
                  <Text variant="body-sm" className="truncate group-hover:text-primary">
                    {group.name}
                  </Text>
                </span>
                {group.role !== 'member' && (
                  <Badge size="sm" variant={group.role === 'leader' ? 'primary' : 'neutral'}>
                    {GROUP_ROLE_LABELS[group.role]}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const recordCard = (
    <Card variant="flat" padding="md">
      <SideHeading>Personal details</SideHeading>
      <dl className="space-y-2">
        <Row label="Gender" value={member.gender ? GENDER_LABELS[member.gender] : undefined} />
        <Row label="Date of birth" value={member.dateOfBirth ? `${formatDate(member.dateOfBirth)}${age !== null ? ` (${age})` : ''}` : undefined} />
        <Row label="Marital status" value={member.maritalStatus ? MARITAL_LABELS[member.maritalStatus] : undefined} />
        <Row label="Occupation" value={[member.occupation, member.employer].filter(Boolean).join(' · ') || undefined} />
        <Row label="Household role" value={member.householdRole ? HOUSEHOLD_ROLE_LABELS[member.householdRole] : undefined} />
        <Row label="Joined by" value={member.joinMethod ? JOIN_METHOD_LABELS[member.joinMethod] : undefined} />
        {member.previousChurch && <Row label="Previous church" value={member.previousChurch} />}
        {member.invitedBy && <Row label="Invited by" value={member.invitedBy} />}
        <Row
          label="Baptised"
          value={member.isBaptised === undefined ? undefined : member.isBaptised ? (member.baptismDate ? formatDate(member.baptismDate) : 'Yes') : 'Not yet'}
        />
        <Row
          label="Consent"
          value={member.consent ? `Recorded ${formatDate(member.consent.dataProcessingAt)}${member.consent.givenBy === 'guardian' ? ' (guardian)' : ''}` : undefined}
        />
      </dl>
    </Card>
  );

  // ── Right column: stats + tabs ─────────────────────────────────────────
  const stats = (
    <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
      <StatTile label="Attendance" value={member.attendanceRate ? formatPercent(member.attendanceRate, 0) : '—'} icon={CalendarDays} />
      <StatTile
        label="Giving this year"
        value={can('finance:read') && member.givingThisYear ? formatCurrency(member.givingThisYear) : '—'}
        icon={TrendingUp}
      />
      <StatTile label="Groups" value={String(groups.length)} icon={UsersRound} />
      <StatTile label="Certificates" value={String(certificates.length)} icon={Award} />
    </div>
  );

  const tabContent = (
    <>
      {tab === 'overview' && (
        <div className="grid gap-5 2xl:grid-cols-2">
          <Card padding="md" className="space-y-4">
            <Text variant="h3">At a glance</Text>
            <dl className="space-y-3">
              <Row label="Status" value={STATUS_LABELS[member.status]} strong />
              <Row label="Unit" value={member.unitName} strong />
              <Row label="Envelope number" value={member.envelopeNumber} strong />
              <Row label="Most recent sacrament" value={sacraments[0] ? `${sacraments[0].type} · ${formatDate(sacraments[0].date)}` : undefined} strong />
              <Row label="Certificates issued" value={String(certificates.length)} strong />
            </dl>
          </Card>

          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <Text variant="h3">Ministry involvement</Text>
              <Button variant="link" size="sm" onClick={() => setTab('groups')}>
                View all
              </Button>
            </div>
            {groups.length === 0 ? (
              <Text variant="body-sm" color="muted">
                {member.firstName} isn’t serving or meeting in any group yet. Connecting new people to a group is the best predictor that they stay.
              </Text>
            ) : (
              <ul className="space-y-3">
                {groups.slice(0, 4).map((group) => (
                  <li key={group.id} className="flex items-start gap-3">
                    <span className="mt-1.5 size-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} aria-hidden />
                    <div className="min-w-0">
                      <Text variant="body-sm" className="font-semibold">
                        {group.name} <span className="font-normal text-slate-500">· {GROUP_ROLE_LABELS[group.role]}</span>
                      </Text>
                      <Text variant="caption" color="muted" className="block">
                        {formatSchedule(groupById.get(group.id)?.schedule) ?? 'Meets as arranged'}
                      </Text>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {member.notes && (
            <Card padding="md" className="2xl:col-span-2">
              <Text variant="h3" className="mb-2">
                Registration notes
              </Text>
              <Text variant="body" className="whitespace-pre-line">
                {member.notes}
              </Text>
            </Card>
          )}
        </div>
      )}

      {tab === 'groups' && (
        <Card padding="none">
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between">
            <Text variant="h3">Groups</Text>
            {can('groups:manage') && joinableGroups.length > 0 && (
              <AddToGroup
                groups={joinableGroups.map((g) => ({ value: g.id, label: g.name }))}
                isPending={joinGroup.isPending}
                onAdd={(groupId, role) => joinGroup.mutate({ groupId, role })}
              />
            )}
          </div>
          {groups.length === 0 ? (
            <Text variant="body" color="muted" className="px-5 py-8 text-center">
              Not in any group yet.
            </Text>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {groups.map((group) => {
                const full = groupById.get(group.id);
                return (
                  <li key={group.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="size-10 rounded-xl shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: group.color }} aria-hidden>
                      <UsersRound size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/staff/groups/${group.id}`} className="font-semibold text-body hover:text-primary">
                        {group.name}
                      </Link>
                      <Text variant="caption" color="muted" className="block truncate">
                        {full ? GROUP_TYPE_LABELS[full.type] : 'Group'}
                        {formatSchedule(full?.schedule) ? ` · ${formatSchedule(full?.schedule)}` : ''}
                      </Text>
                    </div>
                    <Badge size="sm" variant={group.role === 'leader' ? 'primary' : 'neutral'}>
                      {GROUP_ROLE_LABELS[group.role]}
                    </Badge>
                    {can('groups:manage') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={X}
                        aria-label={`Remove from ${group.name}`}
                        isLoading={leaveGroup.isPending && leaveGroup.variables === group.id}
                        onClick={() => leaveGroup.mutate(group.id)}
                      >
                        <span className="hidden 2xl:inline">Remove</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === 'sacraments' && (
        <Card padding="md" className="space-y-4">
          <Text variant="h3">Sacramental record</Text>
          {sacraments.length === 0 ? (
            <Text variant="body" color="muted">
              Nothing recorded yet.
            </Text>
          ) : (
            <div className="space-y-3">
              {sacraments.map((record) => (
                <div key={record.id} className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0">
                    <Text variant="body" className="font-medium">
                      {record.type}
                    </Text>
                    <Text variant="caption" color="muted">
                      {formatDate(record.date)}
                      {record.officiantName ? ` · ${record.officiantName}` : ''}
                      {record.location ? ` · ${record.location}` : ''}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'attendance' && (
        <Card padding="md">
          <Text variant="h3" className="mb-3">
            Attendance
          </Text>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(member.attendanceRate ?? 0) * 100}%` }} />
          </div>
          <Text variant="body-sm" color="muted">
            {member.attendanceRate ? formatPercent(member.attendanceRate, 0) : '—'} of gatherings this year.
          </Text>
          <Link to="/staff/attendance/report">
            <Button variant="secondary" size="sm" className="mt-4">
              Open the full register
            </Button>
          </Link>
        </Card>
      )}

      {tab === 'giving' && (
        <Card padding="md">
          {can('finance:read') ? (
            <>
              <Text variant="h3" className="mb-3">
                Giving
              </Text>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div>
                  <Text variant="label" color="muted">
                    This year
                  </Text>
                  <Text variant="number" className="block">{formatCurrency(member.givingThisYear ?? 0)}</Text>
                </div>
                <div>
                  <Text variant="label" color="muted">
                    All time
                  </Text>
                  <Text variant="number" className="block">{formatCurrency(member.totalGiving ?? 0)}</Text>
                </div>
              </div>
              <Link to="/staff/finance/statements">
                <Button variant="secondary" size="sm" className="mt-4">
                  Generate a statement
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-center py-6">
              <Lock size={24} className="text-slate-300 mx-auto mb-2" aria-hidden />
              <Text variant="body" color="muted">
                You need the finance permission to see individual giving.
              </Text>
            </div>
          )}
        </Card>
      )}

      {tab === 'notes' && (
        <Card padding="md">
          {can('pastoral_notes:read') ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Lock size={15} className="text-warning" aria-hidden />
                <Text variant="label" className="text-warning">
                  Confidential
                </Text>
              </div>
              {notes.length === 0 ? (
                <Text variant="body" color="muted">
                  No notes recorded.
                </Text>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3">
                      <div
                        className="text-body text-amber-900 dark:text-amber-300 [&_p]:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      <Text variant="caption" className="text-amber-700 block mt-2">
                        {note.authorName} · {formatDate(note.createdAt)}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <Lock size={24} className="text-slate-300 mx-auto mb-2" aria-hidden />
              <Text variant="body" color="muted">
                Pastoral notes are restricted. Ask an administrator if you need access.
              </Text>
            </div>
          )}
        </Card>
      )}
    </>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 animate-fade-in space-y-5 xl:space-y-6">
      <Link to="/staff/members" className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} aria-hidden /> Back to directory
      </Link>

      {justSaved && (
        <Card accent="success" padding="sm" className="flex flex-wrap items-center justify-between gap-3" role="status">
          <Text variant="body-sm" className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" aria-hidden />
            {justSaved === 'registered' ? `${member.firstName} is now registered in your church.` : 'Changes saved.'}
          </Text>
          <div className="flex gap-2">
            {justSaved === 'registered' && (
              <Link to="/staff/members/add">
                <Button variant="secondary" size="sm" leftIcon={Plus}>
                  Register another
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('.', { replace: true, state: null })}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {!member.consent && (
        <Card accent="warning" padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="body-sm" className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-600 shrink-0" aria-hidden />
            No data-processing consent is on file for {member.firstName}.
          </Text>
          {can('members:update') && (
            <Link to={`/staff/members/${member.id}/edit`}>
              <Button variant="secondary" size="sm">
                Record consent
              </Button>
            </Link>
          )}
        </Card>
      )}

      {hero}

      {/* Phone: segmented tabs (the underline tabs live in the desktop banner) */}
      <div className="xl:hidden overflow-x-auto -mx-4 px-4">
        <SegmentedControl label="Member record" value={tab} onChange={setTab} size="sm" options={TABS} className="min-w-[36rem]" />
      </div>

      <div className="grid gap-5 xl:gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="order-2 xl:order-1 min-w-0 space-y-5">
          {contactCard}
          {familyCard}
          {groupsCard}
          {recordCard}
        </aside>
        <div className="order-1 xl:order-2 min-w-0 space-y-5">
          {stats}
          {tabContent}
        </div>
      </div>
    </div>
  );
}

// ─── Small building blocks ──────────────────────────────────────────────────

function SideHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <Text variant="label" color="muted">
        {children}
      </Text>
      {action}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <dt className="text-caption text-slate-500">{label}</dt>
        <dd className="text-body-sm text-slate-900 dark:text-slate-100">{value}</dd>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-body-sm text-slate-500 shrink-0">{label}</dt>
      <dd className={cn('text-body-sm text-right min-w-0', strong && 'font-medium', value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400')}>
        {value || '—'}
      </dd>
    </div>
  );
}

function AddToGroup({
  groups,
  onAdd,
  isPending,
}: {
  groups: Array<{ value: string; label: string }>;
  onAdd: (groupId: string, role: GroupRole) => void;
  isPending: boolean;
}) {
  const [groupId, setGroupId] = useState('');
  const [role, setRole] = useState<GroupRole>('member');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Group to add them to"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        options={[{ value: '', label: 'Add to a group…' }, ...groups]}
        className="w-52 [&_select]:h-9"
      />
      <Select
        aria-label="Role in the group"
        value={role}
        onChange={(e) => setRole(e.target.value as GroupRole)}
        options={Object.entries(GROUP_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
        className="w-32 [&_select]:h-9"
      />
      <Button
        variant="primary"
        size="sm"
        leftIcon={Plus}
        disabled={!groupId}
        isLoading={isPending}
        onClick={() => {
          onAdd(groupId, role);
          setGroupId('');
          setRole('member');
        }}
      >
        Add
      </Button>
    </div>
  );
}
