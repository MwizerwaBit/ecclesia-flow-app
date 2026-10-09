/**
 * @file GroupsList.tsx
 * @description Every ministry, small group, choir and team in the church.
 *
 * Groups are where people actually take part — and someone who belongs to
 * none is the person most likely to drift away. So alongside the groups
 * themselves this screen says how many people are not in any group yet, with
 * a way to see who they are.
 *
 * Desktop shows the groups as a card grid (colour, schedule, leaders, size
 * against capacity) or a table; a phone gets one card per group.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Archive, Clock, LayoutGrid, Lock, Plus, Rows3, Search, UserX, UsersRound } from 'lucide-react';
import type { GroupListItem, GroupType } from '@/types';
import { groupsService } from '@/services/groupsService';
import { membersService } from '@/services/membersService';
import { useRole } from '@/hooks/useRole';
import { Avatar, Badge, Button, Card, DataTable, EmptyState, FilterChips, Input, Select, Skeleton, Text } from '@/components/ui';
import { GROUP_TYPE_LABELS, formatSchedule } from '@/lib/people';
import { cn } from '@/lib/cn';

type TypeFilter = 'all' | GroupType;
type View = 'grid' | 'table';

function LeaderStack({ leaders }: { leaders: GroupListItem['leaders'] }) {
  if (leaders.length === 0) {
    return (
      <Text variant="caption" color="muted">
        No leader yet
      </Text>
    );
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex -space-x-2">
        {leaders.slice(0, 3).map((l) => (
          <Avatar key={l.id} src={l.photoUrl} name={`${l.firstName} ${l.lastName}`} size="xs" className="ring-2 ring-surface dark:ring-surface-dark rounded-full" />
        ))}
      </div>
      <Text variant="caption" color="muted" className="truncate">
        {leaders.map((l) => `${l.firstName} ${l.lastName}`).join(', ')}
      </Text>
    </div>
  );
}

function Capacity({ group }: { group: GroupListItem }) {
  if (!group.capacity) {
    return (
      <Text variant="body-sm" className="tabular-nums font-semibold">
        {group.memberCount} {group.memberCount === 1 ? 'person' : 'people'}
      </Text>
    );
  }
  const ratio = Math.min(1, group.memberCount / group.capacity);
  const full = group.memberCount >= group.capacity;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex justify-between gap-2 mb-1">
        <Text variant="body-sm" className="tabular-nums font-semibold">
          {group.memberCount} / {group.capacity}
        </Text>
        {full && (
          <Text variant="caption" className="text-warning font-semibold">
            Full
          </Text>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-primary')} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function GroupsList() {
  const { can } = useRole();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [view, setView] = useState<View>('grid');
  const [showArchived, setShowArchived] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups', { archived: showArchived }],
    queryFn: () => groupsService.list({ includeArchived: showArchived }),
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const unconnected = useMemo(
    () => roster.filter((m) => m.status !== 'inactive' && (m.groups?.length ?? 0) === 0),
    [roster],
  );

  const typesPresent = useMemo(() => [...new Set(groups.map((g) => g.type))], [groups]);
  const typeOptions: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    ...typesPresent.map((t) => ({ value: t, label: GROUP_TYPE_LABELS[t] })),
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => type === 'all' || g.type === type)
      .filter((g) =>
        q
          ? g.name.toLowerCase().includes(q) ||
            (g.description ?? '').toLowerCase().includes(q) ||
            g.leaders.some((l) => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q))
          : true,
      );
  }, [groups, query, type]);

  const active = groups.filter((g) => !g.isArchived);
  const totalPlaces = active.reduce((sum, g) => sum + g.memberCount, 0);
  const withoutLeader = active.filter((g) => g.leaders.length === 0).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-6 xl:py-8 animate-fade-in">
      <header className="mb-5 xl:mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Text variant="h1" className="mb-1 xl:text-display">
            Groups
          </Text>
          <Text variant="body" color="muted">
            Ministries, small groups, choirs and teams — where your people take part.
          </Text>
        </div>
        {can('groups:manage') && (
          <Link to="/staff/groups/new">
            <Button variant="primary" leftIcon={Plus}>
              New group
            </Button>
          </Link>
        )}
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 mb-5">
        <Card padding="sm" variant="elevated">
          <Text variant="label" color="muted">
            Active groups
          </Text>
          <Text variant="number" className="block">
            {isLoading ? '–' : active.length}
          </Text>
        </Card>
        <Card padding="sm" variant="elevated">
          <Text variant="label" color="muted">
            Places filled
          </Text>
          <Text variant="number" className="block">
            {isLoading ? '–' : totalPlaces}
          </Text>
        </Card>
        <Card padding="sm" variant="elevated">
          <Text variant="label" color="muted">
            Without a leader
          </Text>
          <Text variant="number" className={cn('block', withoutLeader > 0 && 'text-warning')}>
            {isLoading ? '–' : withoutLeader}
          </Text>
        </Card>
        <Link to="/staff/members" state={{ ungrouped: true }} className="block">
          <Card padding="sm" variant="elevated" className="h-full hover:ring-1 hover:ring-primary/30 transition">
            <Text variant="label" color="muted" className="flex items-center gap-1.5">
              <UserX size={13} aria-hidden /> Not in any group
            </Text>
            <Text variant="number" className={cn('block', unconnected.length > 0 && 'text-warning')}>
              {unconnected.length}
            </Text>
          </Card>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="xl:rounded-xl xl:border xl:border-slate-200 xl:dark:border-slate-800 xl:bg-surface xl:dark:bg-surface-dark xl:p-3 mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
        <Input
          type="search"
          placeholder="Search groups or leaders"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={Search}
          className="xl:max-w-md [&_input]:h-12 xl:[&_input]:h-10"
        />
        {/* Phone: chips. Desktop: a select, so the toolbar never overflows however many kinds exist. */}
        <FilterChips label="Filter by type" value={type} onChange={setType} options={typeOptions} className="xl:hidden" />
        <div className="hidden xl:flex flex-1 items-center justify-end gap-2">
          <Select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => setType(e.target.value as TypeFilter)}
            options={typeOptions.map((o) => ({ value: o.value, label: o.value === 'all' ? 'All kinds' : o.label }))}
            className="w-44 [&_select]:h-10"
          />
          <Button variant={showArchived ? 'secondary' : 'ghost'} size="sm" leftIcon={Archive} onClick={() => setShowArchived((v) => !v)} aria-pressed={showArchived}>
            Archived
          </Button>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5" role="group" aria-label="Layout">
            {([
              ['grid', LayoutGrid, 'Cards'],
              ['table', Rows3, 'Table'],
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

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <EmptyState
          icon={query ? Search : UsersRound}
          title={groups.length === 0 ? 'No groups yet' : 'No groups match that'}
          description={
            groups.length === 0
              ? 'Create your first ministry, choir or small group, then add people to it.'
              : 'Try a different search or type.'
          }
          action={
            groups.length === 0 && can('groups:manage') ? (
              <Link to="/staff/groups/new">
                <Button variant="primary" leftIcon={Plus}>
                  Create a group
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {!isLoading && visible.length > 0 && (
        <>
          <div className={cn('grid gap-4 sm:grid-cols-2 2xl:grid-cols-3', view === 'table' && 'xl:hidden')}>
            {visible.map((group) => (
              <Link key={group.id} to={`/staff/groups/${group.id}`} className="group block">
                <Card padding="none" variant="elevated" className="h-full overflow-hidden flex flex-col transition-shadow group-hover:shadow-lg">
                  <div className="h-1.5" style={{ backgroundColor: group.color }} aria-hidden />
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Text variant="h3" className="truncate group-hover:text-primary transition-colors">
                          {group.name}
                        </Text>
                        <Text variant="caption" color="muted">
                          {GROUP_TYPE_LABELS[group.type]}
                          {group.unitName ? ` · ${group.unitName}` : ''}
                        </Text>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {group.isArchived && <Badge size="sm">Archived</Badge>}
                        {!group.isOpen && (
                          <Badge size="sm" variant="neutral">
                            <Lock size={10} aria-hidden /> Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                    {group.description && (
                      <Text variant="body-sm" color="muted" className="line-clamp-2">
                        {group.description}
                      </Text>
                    )}
                    {formatSchedule(group.schedule) && (
                      <Text variant="caption" color="muted" className="flex items-center gap-1.5">
                        <Clock size={13} aria-hidden /> {formatSchedule(group.schedule)}
                      </Text>
                    )}
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
                      <Capacity group={group} />
                    </div>
                    <LeaderStack leaders={group.leaders} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {view === 'table' && (
            <div className="hidden xl:block">
              <DataTable
                caption="Groups"
                rows={visible}
                rowKey={(g) => g.id}
                rowHref={(g) => `/staff/groups/${g.id}`}
                columns={[
                  {
                    key: 'name',
                    header: 'Group',
                    render: (g) => (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} aria-hidden />
                        <div className="min-w-0">
                          <Text variant="body" className="font-semibold truncate block">
                            {g.name}
                          </Text>
                          <Text variant="caption" color="muted">
                            {GROUP_TYPE_LABELS[g.type]}
                          </Text>
                        </div>
                      </div>
                    ),
                  },
                  { key: 'leaders', header: 'Leaders', render: (g) => <LeaderStack leaders={g.leaders} /> },
                  {
                    key: 'schedule',
                    header: 'Meets',
                    className: 'hidden 2xl:table-cell',
                    render: (g) => (
                      <Text variant="body-sm" color="muted">
                        {formatSchedule(g.schedule) ?? '—'}
                      </Text>
                    ),
                  },
                  { key: 'size', header: 'Size', className: 'w-40', render: (g) => <Capacity group={g} /> },
                  {
                    key: 'access',
                    header: 'Joining',
                    className: 'w-28',
                    render: (g) => (
                      <Badge size="sm" variant={g.isOpen ? 'success' : 'neutral'}>
                        {g.isArchived ? 'Archived' : g.isOpen ? 'Open' : 'Closed'}
                      </Badge>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
