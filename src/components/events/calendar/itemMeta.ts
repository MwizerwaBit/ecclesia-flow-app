/**
 * @file itemMeta.ts
 * @description What a calendar item says about itself, in one place so the month
 * chip, the agenda row and the day panel never disagree: its badges, its accent,
 * the time shown on a given day and the sentence a screen reader hears.
 *
 * Works on CalendarItem, so staff, member and public items all go through it. A
 * public item has no status or visibility and simply gets no status badges.
 */
import type { CalendarItem } from '@/types';
import { EVENT_STATUS_LABEL, EVENT_VISIBILITY_LABEL, eventAccent, type EventAccent } from '@/lib/events';
import { dayKeyInZone, describeWhen, formatClock, type DayKey } from '@/lib/calendar';

export type FlagTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export interface ItemFlag {
  key: 'draft' | 'pending_review' | 'changes_requested' | 'canceled' | 'group_only' | 'recurring';
  label: string;
  tone: FlagTone;
}

/**
 * The badges an item earns, most important first: its status when it needs
 * attention (draft, waiting for review, changes requested, canceled), then
 * "Group only", then "Recurring". Published and public items carry no status badge.
 */
export function itemFlags(item: CalendarItem): ItemFlag[] {
  const flags: ItemFlag[] = [];
  switch (item.status) {
    case 'draft':
      flags.push({ key: 'draft', label: EVENT_STATUS_LABEL.draft, tone: 'neutral' });
      break;
    case 'pending_review':
      flags.push({ key: 'pending_review', label: EVENT_STATUS_LABEL.pending_review, tone: 'warning' });
      break;
    case 'changes_requested':
      flags.push({ key: 'changes_requested', label: EVENT_STATUS_LABEL.changes_requested, tone: 'warning' });
      break;
    case 'canceled':
      flags.push({ key: 'canceled', label: EVENT_STATUS_LABEL.canceled, tone: 'danger' });
      break;
  }
  if (item.visibility === 'private') {
    flags.push({ key: 'group_only', label: EVENT_VISIBILITY_LABEL.private, tone: 'info' });
  }
  if (item.isRecurring) flags.push({ key: 'recurring', label: 'Recurring', tone: 'neutral' });
  return flags;
}

export function isCanceled(item: CalendarItem): boolean {
  return item.status === 'canceled';
}

/** The left-border color: status first, then the type's default. Public items count as published. */
export function itemAccent(item: CalendarItem): EventAccent {
  return eventAccent(item.status ?? 'published', item.type);
}

/** Dot colors for the compact month cell, matching the accent borders. */
export const ACCENT_DOT: Record<EventAccent, string> = {
  none: 'bg-slate-400 dark:bg-slate-500',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-amber-500',
  danger: 'bg-danger',
};

/**
 * The time a chip shows on `day`: the start clock on the day the item begins,
 * nothing for all-day items or the later days of a multi-day one.
 */
export function chipTime(item: CalendarItem, day: DayKey, zone: string): string {
  if (item.isAllDay) return '';
  return dayKeyInZone(item.occurrenceStart, zone) === day ? formatClock(item.occurrenceStart, zone) : '';
}

/**
 * The "when" of an agenda row on `day`: the full description on the day an item
 * starts ("9:00 AM – 10:30 AM", "All day", "Mar 10 – Mar 12"), "Continues" on
 * the later days of a timed multi-day item.
 */
export function rowTime(item: CalendarItem, day: DayKey, zone: string): string {
  if (!item.isAllDay && dayKeyInZone(item.occurrenceStart, zone) !== day) return 'Continues';
  return describeWhen(item, zone);
}

/** One sentence for assistive tech: when, what, where, and any flags. */
export function itemLabel(item: CalendarItem, day: DayKey, zone: string): string {
  const parts = [rowTime(item, day, zone), item.title];
  if (item.location) parts.push(item.location);
  for (const flag of itemFlags(item)) parts.push(flag.label);
  return parts.join(', ');
}
