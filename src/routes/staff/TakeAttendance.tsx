/**
 * @file TakeAttendance.tsx
 * @description US-031 — the most-used screen in the product.
 *
 * The constraint that shapes every decision here: a church secretary must mark
 * ~87 members present in under five minutes, one-handed, on a phone, while a
 * service is starting. So:
 *   - The running count is the largest thing on screen.
 *   - Search matches name *or* envelope number, because regulars are known by number.
 *   - Marking is optimistic: the row flips instantly, the request catches up after.
 *   - Marked members stay in place rather than jumping to a separate list — a moving
 *     list loses the user's place mid-scroll.
 *
 * On desktop the roster moves left and a detail pane appears beside it, showing
 * whoever was last marked along with the session total. The interaction is
 * unchanged — tap a row to mark — so the flow a volunteer learns on a phone is
 * the flow they already know at the welcome desk.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CheckCheck, Search, UserCheck, Users } from 'lucide-react';
import type { MemberListItem } from '@/types';
import { membersService } from '@/services/membersService';
import { eventsService } from '@/services/eventsService';
import { MasterDetail } from '@/components/layout';
import { Avatar, Badge, Button, Card, EmptyState, Input, StatTile, Text } from '@/components/ui';
import { formatDate, formatPercent, formatTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function TakeAttendance() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [query, setQuery] = useState('');
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  /** Set briefly after a mark so the row can acknowledge the tap. */
  const [justMarkedId, setJustMarkedId] = useState<string | null>(null);
  /** Fills the desktop detail pane; the last person touched, marked or unmarked. */
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const { data: events } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsService.list({ upcoming: true }),
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });

  const activeEvent = useMemo(
    () => events?.find((e) => e.id === eventId) ?? events?.[0],
    [events, eventId],
  );

  // Sorted by last name — how a paper register reads, and how staff scan for a person.
  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...members]
      .filter((m) => m.status !== 'inactive')
      .filter((m) =>
        q
          ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
            (m.envelopeNumber ?? '').includes(q)
          : true,
      )
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [members, query]);

  const expectedCount = members.filter((m) => m.status !== 'inactive').length;
  const focused = members.find((m) => m.id === focusedId);

  async function toggle(member: MemberListItem) {
    if (!activeEvent) return;
    const isPresent = presentIds.has(member.id);

    setFocusedId(member.id);

    // Optimistic: the tap must land before the network does.
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (isPresent) next.delete(member.id);
      else next.add(member.id);
      return next;
    });

    if (!isPresent) {
      setJustMarkedId(member.id);
      window.setTimeout(() => setJustMarkedId((id) => (id === member.id ? null : id)), 600);
    }

    try {
      if (isPresent) {
        await eventsService.unmarkPresent(activeEvent.id, member.id);
      } else {
        await eventsService.markPresent({
          eventId: activeEvent.id,
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
        });
      }
    } catch {
      // Roll back the single row that failed; the rest of the session is untouched.
      setPresentIds((prev) => {
        const next = new Set(prev);
        if (isPresent) next.add(member.id);
        else next.delete(member.id);
        return next;
      });
    }
  }

  function markAllVisible() {
    setPresentIds((prev) => {
      const next = new Set(prev);
      roster.forEach((m) => next.add(m.id));
      return next;
    });
    if (activeEvent) {
      roster.forEach((m) => {
        void eventsService.markPresent({
          eventId: activeEvent.id,
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`,
        });
      });
    }
  }

  const progress = expectedCount > 0 ? presentIds.size / expectedCount : 0;

  // ── The running count, shared by both layouts ──────────────────────────────
  const countCard = (
    <div className="rounded-2xl bg-primary p-5 shadow-primary-glow">
      <div className="flex items-center justify-between">
        <div>
          <Text variant="label" className="text-white/75">
            Present
          </Text>
          <p className="font-sans text-[2.5rem] leading-none font-semibold text-white tabular-nums mt-1">
            {presentIds.size}
            <span className="text-white/60 text-h2 font-normal"> / {expectedCount}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-xl bg-white/20 p-2.5">
            <Users size={26} className="text-white" aria-hidden />
          </div>
          <span className="text-caption text-white/75 tabular-nums">
            {formatPercent(progress, 0)}
          </span>
        </div>
      </div>
    </div>
  );

  // ── The roster, which is the whole screen on a phone ───────────────────────
  const rosterList = (
    <div className="space-y-2.5">
      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading the roster…
        </Text>
      )}

      {!isLoading && roster.length === 0 && (
        <EmptyState
          icon={Search}
          title="No one matches that"
          description={`Nothing found for "${query}". Try a surname or the envelope number.`}
        />
      )}

      {roster.map((member) => {
        const isPresent = presentIds.has(member.id);
        const isCelebrating = justMarkedId === member.id;
        const isFocused = focusedId === member.id;

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => toggle(member)}
            aria-pressed={isPresent}
            className={cn(
              'w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left',
              'transition-all duration-fast active:scale-[0.98]',
              isPresent
                ? 'bg-primary-light dark:bg-primary/15 border-primary/30'
                : 'bg-surface dark:bg-surface-dark border-slate-100 dark:border-slate-800 shadow-card',
              isFocused && 'lg:ring-2 lg:ring-primary/40',
              isCelebrating && 'animate-pulse-primary',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="md"
                  className={cn(!isPresent && 'grayscale opacity-90')}
                />
                {isPresent && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary border-2 border-background-light dark:border-background-dark">
                    <Check size={11} className="text-white" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100">
                  {member.lastName}, {member.firstName}
                </p>
                <Text variant="caption" color="muted">
                  {member.envelopeNumber ? `#${member.envelopeNumber}` : 'No envelope'}
                  {member.unitName ? ` · ${member.unitName}` : ''}
                </Text>
              </div>
            </div>

            <span
              className={cn(
                'shrink-0 rounded-lg px-4 py-2 text-body-sm font-bold',
                isPresent ? 'bg-primary/15 text-primary' : 'bg-primary text-white shadow-primary-glow',
              )}
            >
              {isPresent ? 'UNDO' : 'MARK'}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ── The desktop-only pane: who was just marked, and how the session stands ──
  const detailPane = (
    <div className="space-y-4">
      {focused ? (
        <Card padding="md">
          <div className="flex items-start gap-4">
            <Avatar
              src={focused.photoUrl}
              name={`${focused.firstName} ${focused.lastName}`}
              size="xl"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-member-name text-h2 truncate text-slate-900 dark:text-slate-100">
                {focused.firstName} {focused.lastName}
              </p>
              <Text variant="body-sm" color="muted">
                {focused.unitName ?? 'No group'}
                {focused.envelopeNumber ? ` · #${focused.envelopeNumber}` : ''}
              </Text>
              <Badge
                variant={presentIds.has(focused.id) ? 'success' : 'neutral'}
                dot
                className="mt-2"
              >
                {presentIds.has(focused.id) ? 'Marked present' : 'Not marked'}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <Text variant="label" color="muted">
                Last seen
              </Text>
              <Text variant="body" className="mt-0.5">
                {focused.lastSeenAt ? formatDate(focused.lastSeenAt) : 'No record'}
              </Text>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <Text variant="label" color="muted">
                Status
              </Text>
              <Text variant="body" className="mt-0.5 capitalize">
                {focused.status}
              </Text>
            </div>
          </div>

          <Link to={`/staff/members/${focused.id}`}>
            <Button variant="secondary" size="sm" fullWidth className="mt-4">
              Open full record
            </Button>
          </Link>
        </Card>
      ) : (
        <Card variant="outline" padding="lg" className="text-center">
          <UserCheck size={28} className="text-slate-300 mx-auto mb-3" aria-hidden />
          <Text variant="body" color="muted">
            Mark someone present and their record appears here.
          </Text>
        </Card>
      )}

      <Card padding="md">
        <Text variant="label" color="muted" className="mb-3 block">
          Session
        </Text>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-primary transition-all duration-slow"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between">
          <Text variant="body-sm" color="muted">
            {presentIds.size} present
          </Text>
          <Text variant="body-sm" color="muted">
            {Math.max(0, expectedCount - presentIds.size)} still to come
          </Text>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Expected" value={String(expectedCount)} icon={Users} />
        <StatTile label="Rate" value={formatPercent(progress, 0)} icon={UserCheck} />
      </div>
    </div>
  );

  return (
    <div className="w-full animate-fade-in">
      {/* Count and search stay pinned: the user scrolls the roster, never these */}
      <div className="sticky top-0 z-sticky bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-5 pb-3 lg:px-6">
        <div className="max-w-2xl lg:max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <Text variant="h2" as="h1" className="truncate">
                {activeEvent?.title ?? 'Attendance'}
              </Text>
              <Text variant="body-sm" color="muted">
                {activeEvent
                  ? `${formatTime(activeEvent.startDateTime)} · ${activeEvent.location ?? 'Location TBC'}`
                  : 'No event selected'}
              </Text>
            </div>
            <Button variant="ghost" size="sm" leftIcon={CheckCheck} onClick={markAllVisible}>
              Mark all
            </Button>
          </div>

          {/* The count card is the hero on a phone; on desktop it sits beside the search */}
          <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5 lg:items-center">
            <div className="mb-4 lg:mb-0">{countCard}</div>

            <div>
              <Input
                type="search"
                inputMode="search"
                placeholder="Name or envelope number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leftIcon={Search}
                className="[&_input]:h-14 [&_input]:text-body-lg"
              />
              <Text variant="caption" color="muted" className="block text-center mt-2">
                Tap a name to record presence
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 lg:px-6">
        <MasterDetail master={rosterList} detail={detailPane} split="list-heavy" />
      </div>
    </div>
  );
}
