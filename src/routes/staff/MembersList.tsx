/**
 * @file MembersList.tsx
 * @description The church directory — search first, filter second.
 *
 * Search sits above everything because staff arrive here looking for one person,
 * not browsing. The FAB opens visitor quick-add rather than the full add-member
 * form: capturing someone during a service is the time-critical case, and the
 * full form is one tap further on.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Mail, Phone, Search, UserPlus, Users } from 'lucide-react';
import type { HierarchyUnit, MemberListItem, MemberStatus } from '@/types';
import { membersService } from '@/services/membersService';
import { commsService } from '@/services/commsService';
import { useRole } from '@/hooks/useRole';
import { VisitorQuickAddSheet } from '@/components/people/VisitorQuickAddSheet';
import { Avatar, Badge, Button, Card, EmptyState, Fab, FilterChips, Input, Skeleton, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

type Filter = 'all' | MemberStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Members' },
  { value: 'visitor', label: 'Visitors' },
  { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<MemberStatus, { variant: 'success' | 'info' | 'neutral'; label: string }> = {
  active: { variant: 'success', label: 'Member' },
  visitor: { variant: 'info', label: 'Visitor' },
  prospect: { variant: 'info', label: 'Prospect' },
  inactive: { variant: 'neutral', label: 'Inactive' },
};

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

export function MembersList() {
  const { can, unitScopeId } = useRole();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [isSheetOpen, setSheetOpen] = useState(false);
  /** Visitors added in this session, shown before the query cache catches up. */
  const [justAdded, setJustAdded] = useState<MemberListItem[]>([]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
    enabled: Boolean(unitScopeId),
  });

  const scopedNames = useMemo(
    () => (unitScopeId ? unitScopeNames(units, unitScopeId) : null),
    [units, unitScopeId],
  );

  const visible = useMemo(() => {
    const all = [...justAdded, ...members];
    const q = query.trim().toLowerCase();
    return all
      .filter((m) => !scopedNames || (m.unitName && scopedNames.has(m.unitName)))
      .filter((m) => (filter === 'all' ? true : m.status === filter))
      .filter((m) =>
        q
          ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
            (m.envelopeNumber ?? '').includes(q) ||
            (m.unitName ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [members, justAdded, query, filter, scopedNames]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Directory
        </Text>
        <Text variant="body" color="muted">
          {scopedNames
            ? `${visible.length} ${visible.length === 1 ? 'person' : 'people'} in your unit.`
            : `${members.length} ${members.length === 1 ? 'person' : 'people'} in your congregation.`}
        </Text>
      </header>

      {can('members:export') && (
        <div className="flex gap-2 mb-4">
          <Link to="/staff/members/export" className="ml-auto">
            <Button variant="ghost" size="sm" leftIcon={Download}>
              Export
            </Button>
          </Link>
        </div>
      )}

      <Input
        type="search"
        placeholder="Search by name, envelope number or group"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={Search}
        className="mb-4 [&_input]:h-12"
      />

      <FilterChips
        label="Filter the directory"
        value={filter}
        onChange={setFilter}
        options={FILTERS}
        className="mb-5"
      />

      {isLoading && (
        <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Loading the directory">
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

      {!isLoading && visible.length === 0 && (
        <EmptyState
          icon={query ? Search : Users}
          title={query ? 'No one matches that' : 'Nobody here yet'}
          description={
            query
              ? `Nothing found for "${query}".`
              : 'Your congregation starts here — add the first person.'
          }
          action={
            !query ? (
              <Button variant="primary" leftIcon={UserPlus} onClick={() => setSheetOpen(true)}>
                Add someone
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visible.map((member) => {
          const badge = STATUS_BADGE[member.status];
          return (
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
                  <Text variant="caption" color="muted">
                    {member.unitName ?? 'No group'}
                    {member.envelopeNumber ? ` · #${member.envelopeNumber}` : ''}
                  </Text>
                  {member.lastSeenAt && (
                    <Text variant="caption" color="muted" className="block">
                      Last seen {formatRelative(member.lastSeenAt)}
                    </Text>
                  )}
                </div>

                <Badge variant={badge.variant} size="sm" className="shrink-0">
                  {badge.label}
                </Badge>
              </Link>

              {/* Reach out without leaving the list — the pastoral shortcut */}
              <div className="hidden lg:flex gap-1 border-t border-slate-100 dark:border-slate-800 px-3.5 py-2">
                <Button variant="ghost" size="sm" leftIcon={Phone}>
                  Call
                </Button>
                <Button variant="ghost" size="sm" leftIcon={Mail}>
                  Email
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Fab icon={UserPlus} label="Add visitor" onClick={() => setSheetOpen(true)} />

      <VisitorQuickAddSheet
        open={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={(visitor) => setJustAdded((prev) => [visitor, ...prev])}
      />
    </div>
  );
}
