/**
 * @file MemberProfileStaff.tsx
 * @description The page a pastor lives on (US-024).
 *
 * The record and the facts about it are separated: tabs carry the history a
 * pastor reads through, the aside carries what they need at a glance while
 * reading it — how to reach this person, who they live with, what the church has
 * recorded. On a phone the aside simply follows the tabs.
 *
 * Pastoral notes are behind a permission check rather than merely hidden,
 * because "confidential" that is only a CSS class is not confidential.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Edit,
  Home,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  TrendingUp,
} from 'lucide-react';
import { membersService } from '@/services/membersService';
import { certificatesService } from '@/services/certificatesService';
import { useRole } from '@/hooks/useRole';
import { DetailLayout } from '@/components/layout';
import { Avatar, Badge, Button, Card, SegmentedControl, StatTile, Text } from '@/components/ui';
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/formatters';

type Tab = 'overview' | 'attendance' | 'giving' | 'notes';

export function MemberProfileStaff() {
  const { id = '' } = useParams();
  const { can } = useRole();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersService.getById(id),
    enabled: Boolean(id),
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

  if (isLoading || !member) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading member…
      </Text>
    );
  }

  const fullName = `${member.firstName} ${member.lastName}`;

  const hero = (
    <Card padding="lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Avatar src={member.photoUrl} name={fullName} size="xl" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <Text variant="display" as="h1" className="min-w-0">
              {fullName}
            </Text>
            <Badge
              variant={member.status === 'active' ? 'success' : 'neutral'}
              dot
              className="shrink-0 capitalize"
            >
              {member.status}
            </Badge>
          </div>

          <Text variant="body" color="muted">
            {member.unitName ?? 'No group'}
            {member.envelopeNumber ? ` · envelope #${member.envelopeNumber}` : ''}
            {member.joinedAt ? ` · member since ${formatDate(member.joinedAt)}` : ''}
          </Text>

          {member.lastSeenAt && (
            <Text variant="caption" color="muted" className="block mt-1">
              Last seen {formatRelative(member.lastSeenAt)}
            </Text>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="primary" size="sm" leftIcon={MessageCircle}>
              Message
            </Button>
            <Button variant="secondary" size="sm" leftIcon={Edit}>
              Edit
            </Button>
            <Link to={`/staff/households/${member.householdId ?? member.id}`}>
              <Button variant="secondary" size="sm" leftIcon={Home}>
                Household
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Attendance"
        value={member.attendanceRate ? formatPercent(member.attendanceRate, 0) : '—'}
        icon={CalendarDays}
      />
      <StatTile
        label="Giving this year"
        value={member.givingThisYear ? formatCurrency(member.givingThisYear) : '—'}
        icon={TrendingUp}
      />
      <StatTile label="Certificates" value={String(certificates.length)} icon={Award} />
      <StatTile label="Sacraments" value={String(sacraments.length)} icon={Award} />
    </div>
  );

  const main = (
    <>
      <SegmentedControl
        label="Member record"
        value={tab}
        onChange={setTab}
        size="sm"
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'attendance', label: 'Attendance' },
          { value: 'giving', label: 'Giving' },
          { value: 'notes', label: 'Notes' },
        ]}
      />

      {tab === 'overview' && (
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
                  <div className="mt-1 size-2 rounded-full bg-primary shrink-0" />
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
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(member.attendanceRate ?? 0) * 100}%` }}
            />
          </div>
          <Text variant="body-sm" color="muted">
            {member.attendanceRate ? formatPercent(member.attendanceRate, 0) : '—'} of gatherings
            this year.
          </Text>
          <Link to="/staff/attendance/report">
            <Button variant="secondary" size="sm" fullWidth className="mt-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Text variant="label" color="muted">
                    This year
                  </Text>
                  <Text variant="number">{formatCurrency(member.givingThisYear ?? 0)}</Text>
                </div>
                <div>
                  <Text variant="label" color="muted">
                    All time
                  </Text>
                  <Text variant="number">{formatCurrency(member.totalGiving ?? 0)}</Text>
                </div>
              </div>
              <Link to="/staff/finance/statements">
                <Button variant="secondary" size="sm" fullWidth className="mt-4">
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
                    <div
                      key={note.id}
                      className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3"
                    >
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

  const aside = (
    <>
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-3 block">
          Contact
        </Text>
        <div className="space-y-3">
          {member.phone && (
            <a href={`tel:${member.phone}`} className="flex items-start gap-3 group">
              <Phone size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
              <Text variant="body-sm" className="group-hover:text-primary transition-colors">
                {member.phone}
              </Text>
            </a>
          )}
          {member.email && (
            <a href={`mailto:${member.email}`} className="flex items-start gap-3 group min-w-0">
              <Mail size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
              <Text
                variant="body-sm"
                className="truncate group-hover:text-primary transition-colors"
              >
                {member.email}
              </Text>
            </a>
          )}
          {member.address && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
              <Text variant="body-sm">
                {member.address.line1}
                <br />
                {member.address.city}
                {member.address.state ? `, ${member.address.state}` : ''}{' '}
                {member.address.postalCode}
              </Text>
            </div>
          )}
        </div>
      </Card>

      <Card padding="md">
        <Text variant="label" color="muted" className="mb-3 block">
          Certificates
        </Text>
        {certificates.length === 0 ? (
          <Text variant="body-sm" color="muted">
            None issued yet.
          </Text>
        ) : (
          <div className="space-y-2">
            {certificates.map((certificate) => (
              <Link
                key={certificate.id}
                to={`/staff/certificates/issued/${certificate.id}`}
                className="flex items-center justify-between gap-2 group"
              >
                <Text
                  variant="body-sm"
                  className="truncate group-hover:text-primary transition-colors"
                >
                  {certificate.templateName}
                </Text>
                <Text variant="caption" color="muted" className="shrink-0">
                  {formatDate(certificate.issuedAt)}
                </Text>
              </Link>
            ))}
          </div>
        )}
        <Link to="/staff/certificates/issue">
          <Button variant="ghost" size="sm" fullWidth className="mt-3">
            Issue a certificate
          </Button>
        </Link>
      </Card>

      <Card variant="flat" padding="md">
        <Text variant="label" color="muted" className="mb-2 block">
          Record
        </Text>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-3">
            <Text variant="caption" color="muted">
              Joined
            </Text>
            <Text variant="caption">{member.joinedAt ? formatDate(member.joinedAt) : '—'}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text variant="caption" color="muted">
              Date of birth
            </Text>
            <Text variant="caption">
              {member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'}
            </Text>
          </div>
          <div className="flex justify-between gap-3">
            <Text variant="caption" color="muted">
              Occupation
            </Text>
            <Text variant="caption">{member.occupation ?? '—'}</Text>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6 animate-fade-in">
      <Link
        to="/staff/members"
        className="inline-flex items-center gap-1 text-body-sm text-slate-500 hover:text-primary mb-5 transition-colors"
      >
        <ArrowLeft size={16} /> Back to directory
      </Link>

      <DetailLayout hero={hero} stats={stats} main={main} aside={aside} />
    </div>
  );
}
