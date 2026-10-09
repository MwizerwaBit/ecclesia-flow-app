/**
 * @file MembersList.tsx
 * @description The church directory — search first, filter second.
 *
 * Search sits above everything because staff arrive here looking for one person,
 * not browsing. On a phone the FAB opens visitor quick-add — capturing someone
 * during a service is the time-critical case.
 *
 * Desktop is a different job: an administrator at a desk working through the
 * roster. So from lg up the screen becomes a workspace — status counts that
 * double as filters, a toolbar with group/unit filters and sorting, a dense
 * table (or a photo grid for putting names to faces) and pagination, with
 * "Register member" as the primary action rather than a floating button.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Mail,
  MessageCircle,
  Phone,
  Rows3,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import type { HierarchyUnit, MemberListItem, MemberStatus } from '@/types';
import { membersService } from '@/services/membersService';
import { groupsService } from '@/services/groupsService';
import { commsService } from '@/services/commsService';
import { useRole } from '@/hooks/useRole';
import { VisitorQuickAddSheet } from '@/components/people/VisitorQuickAddSheet';
import { GroupChips } from '@/components/people/GroupChips';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Fab,
  FilterChips,
  Input,
  Select,
  Skeleton,
  Text,
} from '@/components/ui';
import { formatRelative } from '@/lib/formatters';
import { STATUS_BADGE, STATUS_LABELS } from '@/lib/people';
import { cn } from '@/lib/cn';

type Filter = 'all' | MemberStatus;
type SortKey = 'name' | 'recent' | 'lastSeen' | 'envelope';
type View = 'table' | 'grid';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Members' },
  { value: 'visitor', label: 'Visitors' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'inactive', label: 'Inactive' },
];

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'name', label: 'Sort: Name A–Z' },
  { value: 'recent', label: 'Sort: Newest first' },
  { value: 'lastSeen', label: 'Sort: Last seen' },
  { value: 'envelope', label: 'Sort: Envelope #' },
];

const PAGE_SIZE = 25;
/** Group filter value meaning "people in no group at all". */
const NO_GROUP = '__none';
const VIEW_KEY = 'ecclesiaflow-directory-view';

/** The scoped unit's own name plus every descendant unit's name — ABAC narrows
 * the directory to a branch's own subtree, not just its exact unit. */
function unitScopeNames(units: HierarchyUnit[], scopeUnitId: string): Set<string> {
  const childrenByParent = new Map<string, HierarchyUnit[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    childrenByParent.set(unit.parentId, [...(childrenByParent.get(unit.parentId) ?? []), unit]);
  }
  const root = units.find((u) => u.id === scopeUnitId);
  if (!root) return new Set();
  const names = new Set([root.name]);
  const queue = [root.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of childrenByParent.get(id) ?? []) {
      names.add(child.name);
      queue.push(child.id);
    }
  }
  return names;
}

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table';
  } catch {
    return 'table';
  }
}

function sortMembers(rows: MemberListItem[], sort: SortKey): MemberListItem[] {
  const copy = [...rows];
  switch (sort) {
    case 'recent':
      return copy.sort((a, b) => (b.joinedAt ?? '').localeCompare(a.joinedAt ?? ''));
    case 'lastSeen':
      return copy.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''));
    case 'envelope':
      return copy.sort((a, b) => (Number(a.envelopeNumber) || Infinity) - (Number(b.envelopeNumber) || Infinity));
    default:
      return copy.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }
}

/** Icon-only contact links for dense desktop rows; the label lives in aria-label/title. */
function ContactIcons({ member }: { member: MemberListItem }) {
  const name = `${member.firstName} ${member.lastName}`;
  const whatsapp = (member.whatsapp ?? member.phone)?.replace(/\D/g, '');
  const linkClass =
    'inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-primary-light hover:text-primary dark:hover:bg-primary/15 transition-colors';
  return (
    <div className="flex items-center justify-end gap-1">
      {member.phone && (
        <a href={`tel:${member.phone}`} className={linkClass} aria-label={`Call ${name}`} title={`Call ${member.phone}`}>
          <Phone size={16} aria-hidden />
        </a>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
          aria-label={`Message ${name} on WhatsApp`}
          title="WhatsApp"
        >
          <MessageCircle size={16} aria-hidden />
        </a>
      )}
      {member.email && (
        <a href={`mailto:${member.email}`} className={linkClass} aria-label={`Email ${name}`} title={member.email}>
          <Mail size={16} aria-hidden />
        </a>
      )}
    </div>
  );
}

export function MembersList() {
  const { can, unitScopeId } = useRole();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const location = useLocation();
  // Groups' "Not in any group" count links here with this flag set.
  const [groupId, setGroupId] = useState(() =>
    (location.state as { ungrouped?: boolean } | null)?.ungrouped ? NO_GROUP : '',
  );
  const [unitId, setUnitId] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [view, setViewState] = useState<View>(readView);
  const [page, setPage] = useState(0);
  const [isSheetOpen, setSheetOpen] = useState(false);

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsService.list(),
    enabled: can('groups:read'),
  });

  function setView(next: View) {
    setViewState(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // A remembered view is a convenience; nothing breaks without it.
    }
  }

  const scopedNames = useMemo(
    () => (unitScopeId ? unitScopeNames(units, unitScopeId) : null),
    [units, unitScopeId],
  );

  /** Everyone this session may see, before the user's own filters. */
  const inScope = useMemo(
    () => members.filter((m) => !scopedNames || (m.unitName && scopedNames.has(m.unitName))),
    [members, scopedNames],
  );

  const counts = useMemo(() => {
    const byStatus: Record<Filter, number> = { all: inScope.length, active: 0, visitor: 0, prospect: 0, inactive: 0 };
    for (const m of inScope) byStatus[m.status] += 1;
    return byStatus;
  }, [inScope]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = inScope
      .filter((m) => (filter === 'all' ? true : m.status === filter))
      .filter((m) =>
        groupId === NO_GROUP ? !m.groups?.length : groupId ? m.groups?.some((g) => g.id === groupId) : true,
      )
      .filter((m) => (unitId ? m.unitId === unitId : true))
      .filter((m) =>
        q
          ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
            (m.preferredName ?? '').toLowerCase().includes(q) ||
            (m.envelopeNumber ?? '').includes(q) ||
            (m.email ?? '').toLowerCase().includes(q) ||
            (m.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000') ||
            (m.unitName ?? '').toLowerCase().includes(q) ||
            (m.groups ?? []).some((g) => g.name.toLowerCase().includes(q))
          : true,
      );
    return sortMembers(filtered, sort);
  }, [inScope, query, filter, groupId, unitId, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasFilters = Boolean(query || groupId || unitId || filter !== 'all');

  /** Any filter change goes back to the first page. */
  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  function clearFilters() {
    setQuery('');
    setFilter('all');
    setGroupId('');
    setUnitId('');
    setPage(0);
  }

  const emptyState = (
    <EmptyState
      icon={hasFilters ? Search : Users}
      title={hasFilters ? 'No one matches that' : 'Nobody here yet'}
      description={
        hasFilters
          ? query
            ? `Nothing found for "${query}" with the current filters.`
            : 'No one matches the current filters.'
          : 'Your congregation starts here — register the first person.'
      }
      action={
        hasFilters ? (
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : can('members:create') ? (
          <Link to="/staff/members/add">
            <Button variant="primary" leftIcon={UserPlus}>
              Register someone
            </Button>
          </Link>
        ) : undefined
      }
    />
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 xl:py-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-5 xl:mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Text variant="h1" className="mb-1 xl:text-display">
            Directory
          </Text>
          <Text variant="body" color="muted">
            {scopedNames
              ? `${inScope.length} ${inScope.length === 1 ? 'person' : 'people'} in your unit.`
              : `${inScope.length} ${inScope.length === 1 ? 'person' : 'people'} in your congregation.`}
          </Text>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {can('members:export') && (
            <Link to="/staff/members/export">
              <Button variant="ghost" size="sm" leftIcon={Download}>
                Export
              </Button>
            </Link>
          )}
          {can('members:create') && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={UserPlus}
                className="hidden xl:inline-flex"
                onClick={() => setSheetOpen(true)}
              >
                Quick-add visitor
              </Button>
              <Link to="/staff/members/add">
                <Button variant="primary" size="sm" leftIcon={UserPlus}>
                  Register member
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Desktop: status counts that are also the status filter ── */}
      <div className="hidden xl:grid grid-cols-5 gap-3 mb-5" role="group" aria-label="Filter by status">
        {FILTERS.map((option) => {
          const selected = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => resetPage(setFilter)(option.value)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left transition-colors',
                selected
                  ? 'border-primary bg-primary-light/60 dark:bg-primary/15'
                  : 'border-slate-200 dark:border-slate-800 bg-surface dark:bg-surface-dark hover:border-primary/40',
              )}
            >
              <Text variant="label" color={selected ? 'primary' : 'muted'} className="block">
                {option.value === 'all' ? 'Everyone' : option.label}
              </Text>
              <Text variant="number" className="block mt-1">
                {isLoading ? '–' : counts[option.value]}
              </Text>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="xl:rounded-xl xl:border xl:border-slate-200 xl:dark:border-slate-800 xl:bg-surface xl:dark:bg-surface-dark xl:p-3 mb-4 xl:mb-5 flex flex-col gap-3 2xl:flex-row 2xl:items-center">
        <Input
          type="search"
          placeholder="Search name, envelope, phone, email or group"
          value={query}
          onChange={(e) => resetPage(setQuery)(e.target.value)}
          leftIcon={Search}
          className="2xl:flex-1 [&_input]:h-12 xl:[&_input]:h-10"
        />

        <div className="hidden xl:flex flex-wrap items-center gap-2">
          {can('groups:read') && (
            <Select
              aria-label="Filter by group"
              value={groupId}
              onChange={(e) => resetPage(setGroupId)(e.target.value)}
              options={[
                { value: '', label: 'All groups' },
                { value: NO_GROUP, label: 'Not in any group' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              className="w-48 [&_select]:h-10"
            />
          )}
          {!scopedNames && (
            <Select
              aria-label="Filter by unit"
              value={unitId}
              onChange={(e) => resetPage(setUnitId)(e.target.value)}
              options={[{ value: '', label: 'All units' }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
              className="w-44 [&_select]:h-10"
            />
          )}
          <Select
            aria-label="Sort the directory"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            options={SORTS}
            className="w-48 [&_select]:h-10"
          />
          <div
            className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5"
            role="group"
            aria-label="Layout"
          >
            {([
              ['table', Rows3, 'Table'],
              ['grid', LayoutGrid, 'Cards'],
            ] as const).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                aria-label={`${label} view`}
                title={`${label} view`}
                onClick={() => setView(value)}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-md transition-colors',
                  view === value ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary',
                )}
              >
                <Icon size={16} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phone: status chips, since the count tiles are desktop-only. */}
      <FilterChips
        label="Filter the directory"
        value={filter}
        onChange={resetPage(setFilter)}
        options={FILTERS}
        className="mb-5 xl:hidden"
      />

      {isLoading && (
        <div className="grid gap-2.5" aria-label="Loading the directory">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} padding="none">
              <div className="flex items-center gap-3 p-3.5">
                <Skeleton className="size-11 rounded-full shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && emptyState}

      {/* ── Phone: one card per person ─────────────────────────── */}
      {!isLoading && (
        <div className="grid gap-2.5 xl:hidden">
          {visible.map((member) => (
            <Card key={member.id} padding="none" variant="elevated">
              <Link
                to={`/staff/members/${member.id}`}
                className="flex items-center gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100">
                    {member.firstName} {member.lastName}
                  </p>
                  <Text variant="caption" color="muted" className="block truncate">
                    {member.groups?.length ? member.groups.map((g) => g.name).join(', ') : member.unitName ?? 'No group yet'}
                    {member.envelopeNumber ? ` · #${member.envelopeNumber}` : ''}
                  </Text>
                  {member.lastSeenAt && (
                    <Text variant="caption" color="muted" className="block">
                      Last seen {formatRelative(member.lastSeenAt)}
                    </Text>
                  )}
                </div>
                <Badge variant={STATUS_BADGE[member.status]} size="sm" className="shrink-0">
                  {STATUS_LABELS[member.status]}
                </Badge>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* ── Desktop: table ─────────────────────────────────────── */}
      {!isLoading && visible.length > 0 && view === 'table' && (
        <div className="hidden xl:block">
          <DataTable
            caption="Church directory"
            rows={pageRows}
            rowKey={(member) => member.id}
            rowHref={(member) => `/staff/members/${member.id}`}
            columns={[
              {
                key: 'name',
                header: 'Person',
                render: (member) => (
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={member.photoUrl}
                      name={`${member.firstName} ${member.lastName}`}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block font-member-name text-body-lg truncate text-slate-900 dark:text-slate-100">
                        {member.firstName} {member.lastName}
                      </span>
                      <Text variant="caption" color="muted" className="block truncate max-w-56">
                        {member.email ?? member.phone ?? 'No contact on file'}
                      </Text>
                    </div>
                  </div>
                ),
              },
              {
                key: 'groups',
                header: 'Groups',
                render: (member) =>
                  member.groups?.length ? (
                    <GroupChips groups={member.groups} max={1} className="flex-nowrap" />
                  ) : (
                    <Text variant="body-sm" color="muted">
                      —
                    </Text>
                  ),
              },
              {
                key: 'unit',
                header: 'Unit',
                className: 'hidden 2xl:table-cell',
                render: (member) => (
                  <Text variant="body-sm" color="muted" className="whitespace-nowrap">
                    {member.unitName ?? '—'}
                  </Text>
                ),
              },
              {
                key: 'envelope',
                header: 'Envelope',
                className: 'hidden 2xl:table-cell w-24',
                render: (member) => (
                  <Text variant="body-sm" color="muted" className="tabular-nums">
                    {member.envelopeNumber ? `#${member.envelopeNumber}` : '—'}
                  </Text>
                ),
              },
              {
                key: 'lastSeen',
                header: 'Last seen',
                className: 'hidden 2xl:table-cell w-32',
                render: (member) => (
                  <Text variant="body-sm" color="muted" className="whitespace-nowrap">
                    {member.lastSeenAt ? formatRelative(member.lastSeenAt) : '—'}
                  </Text>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                className: 'w-28',
                render: (member) => (
                  <Badge variant={STATUS_BADGE[member.status]} size="sm">
                    {STATUS_LABELS[member.status]}
                  </Badge>
                ),
              },
              {
                key: 'contact',
                header: <span className="sr-only">Contact</span>,
                align: 'right',
                className: 'w-32',
                render: (member) => <ContactIcons member={member} />,
              },
            ]}
          />
        </div>
      )}

      {/* ── Desktop: card grid, for putting names to faces ─────── */}
      {!isLoading && visible.length > 0 && view === 'grid' && (
        <div className="hidden xl:grid grid-cols-3 2xl:grid-cols-4 gap-4">
          {pageRows.map((member) => (
            <Card key={member.id} padding="none" variant="elevated" className="flex flex-col overflow-hidden">
              <Link
                to={`/staff/members/${member.id}`}
                className="flex flex-col items-center text-center gap-3 px-5 pt-6 pb-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex-1"
              >
                <div className="relative">
                  <Avatar src={member.photoUrl} name={`${member.firstName} ${member.lastName}`} size="xl" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100">
                    {member.firstName} {member.lastName}
                  </p>
                  <Text variant="caption" color="muted" className="block truncate">
                    {member.unitName ?? 'No unit'}
                    {member.envelopeNumber ? ` · #${member.envelopeNumber}` : ''}
                  </Text>
                </div>
                <Badge variant={STATUS_BADGE[member.status]} size="sm">
                  {STATUS_LABELS[member.status]}
                </Badge>
                {member.groups && member.groups.length > 0 && (
                  <GroupChips groups={member.groups} max={2} className="justify-center" />
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                <Text variant="caption" color="muted" className="pl-2 truncate">
                  {member.lastSeenAt ? `Seen ${formatRelative(member.lastSeenAt)}` : 'Not seen yet'}
                </Text>
                <ContactIcons member={member} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Desktop: pagination ────────────────────────────────── */}
      {!isLoading && visible.length > PAGE_SIZE && (
        <nav className="hidden xl:flex items-center justify-between mt-4" aria-label="Directory pages">
          <Text variant="body-sm" color="muted">
            Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visible.length)} of{' '}
            {visible.length}
          </Text>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={ChevronLeft}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Text variant="body-sm" color="muted" className="tabular-nums px-2">
              Page {currentPage + 1} of {pageCount}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={ChevronRight}
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}

      {can('members:create') && (
        <Fab icon={UserPlus} label="Add visitor" className="xl:hidden" onClick={() => setSheetOpen(true)} />
      )}

      <VisitorQuickAddSheet
        open={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={() => void refetch()}
      />
    </div>
  );
}
