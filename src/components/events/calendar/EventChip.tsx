/**
 * @file EventChip.tsx
 * @description The two ways one calendar item is drawn: a small chip inside a
 * month-grid cell (EventChip) and a full row in an agenda or a day panel
 * (AgendaRow). Both read a CalendarItem, so the same pieces serve the staff,
 * member and public calendars.
 *
 * Props contract (both components)
 *   item      CalendarItem   the occurrence to draw
 *   day       DayKey         the church day it is drawn on (a multi-day item is
 *                            drawn once per day, and says "Continues" after the first)
 *   zone      string         the church's IANA time zone; every time is shown in it
 *   href      string?        makes the item a link (staff: /staff/events/:id,
 *                            members: /portal/events/:id, public: /c/:slug/events/:id)
 *   onSelect  () => void     alternative to href: makes the item a button
 *   With neither, the item is plain text (nothing to open).
 *   EventChip also takes `tabIndex`: the month grid passes -1 so chips are not
 *   extra tab stops inside the roving-tabindex grid (keyboard users open the day).
 *
 * The colored left border is <Card accent>, from eventAccent(): attention
 * statuses win, otherwise the event type gives a calm default. Canceled items are
 * struck through and dimmed; status and "Group only" show as badges.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Repeat, UsersRound } from 'lucide-react';
import type { CalendarItem } from '@/types';
import type { DayKey } from '@/lib/calendar';
import { cn } from '@/lib/cn';
import { Badge, Card, Text } from '@/components/ui';
import { chipTime, isCanceled, itemAccent, itemFlags, itemLabel, rowTime } from './itemMeta';

interface TargetProps {
  href?: string;
  onSelect?: () => void;
  label: string;
  /** Hover tooltip: the full text of a title the chip had to cut short. */
  title?: string;
  className: string;
  tabIndex?: number;
  children: ReactNode;
}

/** The item's one interactive element: a link, a button, or plain markup. */
function Target({ href, onSelect, label, title, className, tabIndex, children }: TargetProps) {
  const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary';
  if (href) {
    return (
      <Link to={href} aria-label={label} title={title} tabIndex={tabIndex} className={cn(className, focus)}>
        {children}
      </Link>
    );
  }
  if (onSelect) {
    return (
      <button
        type="button"
        aria-label={label}
        title={title}
        tabIndex={tabIndex}
        onClick={onSelect}
        className={cn(className, 'text-left', focus)}
      >
        {children}
      </button>
    );
  }
  return (
    <div title={title} className={className}>
      {children}
    </div>
  );
}

interface ItemProps {
  item: CalendarItem;
  day: DayKey;
  zone: string;
  href?: string;
  onSelect?: () => void;
}

// ─── Chip (month grid, wide screens) ──────────────────────────────────────────

export function EventChip({ item, day, zone, href, onSelect, tabIndex }: ItemProps & { tabIndex?: number }) {
  const accent = itemAccent(item);
  const canceled = isCanceled(item);
  const time = chipTime(item, day, zone);
  // "Recurring" is the small repeat icon here; the cell has no room for a badge.
  const badges = itemFlags(item).filter((flag) => flag.key !== 'recurring');
  const interactive = Boolean(href || onSelect);

  return (
    <Card
      variant="flat"
      padding="none"
      accent={accent}
      className={cn(accent === 'none' ? 'rounded-md' : 'rounded-r-md', canceled && 'opacity-70')}
    >
      <Target
        href={href}
        onSelect={onSelect}
        tabIndex={tabIndex}
        label={itemLabel(item, day, zone)}
        title={item.title}
        className={cn(
          'block w-full min-w-0 px-1.5 py-1 text-caption leading-tight text-slate-800 dark:text-slate-100',
          interactive && 'hover:bg-slate-100 dark:hover:bg-slate-700/60',
        )}
      >
        <span className="flex min-w-0 items-baseline gap-1">
          {time && <span className="shrink-0 font-semibold tabular-nums text-slate-600 dark:text-slate-300">{time}</span>}
          <span className={cn('min-w-0 truncate font-medium', canceled && 'line-through')}>{item.title}</span>
          {item.isRecurring && <Repeat size={10} className="shrink-0 self-center text-slate-400" aria-hidden />}
        </span>
        {badges.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {badges.map((flag) => (
              <Badge key={flag.key} variant={flag.tone} size="sm">
                {flag.label}
              </Badge>
            ))}
          </span>
        )}
      </Target>
    </Card>
  );
}

// ─── Row (agenda and day panel) ───────────────────────────────────────────────

export function AgendaRow({ item, day, zone, href, onSelect }: ItemProps) {
  const canceled = isCanceled(item);
  const flags = itemFlags(item);
  const interactive = Boolean(href || onSelect);

  return (
    <Card variant="elevated" padding="none" accent={itemAccent(item)} className={cn(canceled && 'opacity-80')}>
      <Target
        href={href}
        onSelect={onSelect}
        label={itemLabel(item, day, zone)}
        className={cn(
          'flex min-h-11 w-full items-start gap-3 p-3',
          interactive && 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
        )}
      >
        <Text as="span" variant="body-sm" className="block w-24 shrink-0 pt-0.5 font-semibold tabular-nums">
          {rowTime(item, day, zone)}
        </Text>

        <span className="min-w-0 flex-1">
          <Text as="span" variant="body" className={cn('block font-medium break-words', canceled && 'line-through')}>
            {item.title}
          </Text>
          {item.location && (
            <Text as="span" variant="body-sm" color="muted" className="mt-0.5 flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0" aria-hidden />
              <span className="truncate">{item.location}</span>
            </Text>
          )}
          {item.groupName && (
            <Text as="span" variant="body-sm" color="muted" className="mt-0.5 flex items-center gap-1.5">
              <UsersRound size={13} className="shrink-0" aria-hidden />
              <span className="truncate">{item.groupName}</span>
            </Text>
          )}
          {flags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {flags.map((flag) => (
                <Badge key={flag.key} variant={flag.tone} size="sm">
                  {flag.label}
                </Badge>
              ))}
            </span>
          )}
        </span>

        {interactive && <ChevronRight size={18} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />}
      </Target>
    </Card>
  );
}
