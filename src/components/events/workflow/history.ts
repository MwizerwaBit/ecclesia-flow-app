/**
 * @file history.ts
 * @description One line of an event's audit trail, in words.
 *
 * The API sends an action code ("event.review_approved") and, for edits, a map of
 * the fields that changed with their old and new values. Times inside those
 * values are UTC instants, shown here on the church's clock.
 */
import type { EventHistoryEntry } from '@/types';
import { resolveZone } from '@/lib/calendar';
import { EVENT_TYPE_LABEL, EVENT_VISIBILITY_LABEL } from '@/lib/events';
import { formatDateTime } from '@/lib/formatters';
import { describeRecurrence } from './recurrence';

export interface HistoryLine {
  id: string;
  /** Who did it. */
  who: string;
  /** What they did, as a sentence fragment: "Published", "Changed title from "A" to "B"". */
  what: string;
  /** More lines under it: each change of a multi-field edit, how many reviewers were asked. */
  details: string[];
  /** A reviewer's comment, when there is one. */
  comment: string | null;
  /** When, on the church's clock. */
  when: string;
}

/** Field name (camelCase or snake_case) -> how it reads in a sentence. */
const FIELD_LABEL: Record<string, string> = {
  title: 'title',
  type: 'type',
  location: 'location',
  startDateTime: 'start',
  endDateTime: 'end',
  recurrenceRule: 'repeat schedule',
  visibility: 'visibility',
  groupId: 'group',
  unitId: 'branch',
  isAllDay: 'all-day setting',
  capacity: 'capacity',
  attendanceMode: 'attendance mode',
  description: 'description',
  onlineUrl: 'online link',
  coverImageUrl: 'cover image',
  theme: 'look',
};

const DATE_FIELDS = new Set(['startDateTime', 'endDateTime']);
/** Values that are ids or blobs: saying "changed" is honest, quoting them is not. */
const OPAQUE_FIELDS = new Set(['groupId', 'unitId', 'theme', 'coverImageUrl']);

const camel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function showValue(field: string, value: unknown, zone: string): string {
  if (isEmpty(value)) return 'nothing';
  if (DATE_FIELDS.has(field) && typeof value === 'string') return formatDateTime(value, 'en-US', zone);
  if (field === 'recurrenceRule' && typeof value === 'string') return describeRecurrence(value, zone).toLowerCase();
  if (field === 'type' && typeof value === 'string') return EVENT_TYPE_LABEL[value as keyof typeof EVENT_TYPE_LABEL] ?? value;
  if (field === 'visibility' && typeof value === 'string') {
    return EVENT_VISIBILITY_LABEL[value as keyof typeof EVENT_VISIBILITY_LABEL] ?? value;
  }
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

function changeLine(field: string, from: unknown, to: unknown, zone: string): string {
  const label = FIELD_LABEL[field] ?? field.replace(/([A-Z])/g, ' $1').toLowerCase();
  if (field === 'isAllDay') return to ? 'Made it an all-day gathering' : 'Made it a timed gathering';
  if (OPAQUE_FIELDS.has(field)) return `Changed the ${label}`;
  if (isEmpty(from)) return `Set ${label} to ${showValue(field, to, zone)}`;
  if (isEmpty(to)) return `Cleared the ${label} (was ${showValue(field, from, zone)})`;
  return `Changed ${label} from ${showValue(field, from, zone)} to ${showValue(field, to, zone)}`;
}

/** Edits: one change reads as the sentence itself, several as a summary with the list under it. */
function describeEdit(entry: EventHistoryEntry, zone: string): { what: string; details: string[] } {
  const changed = Object.entries(entry.metadata?.changed ?? {}).map(([key, value]) => ({
    field: camel(key),
    from: value?.from,
    to: value?.to,
  }));
  // Fields that were saved but are not diffed (description, online link...): name them only.
  const saved: unknown = entry.metadata?.fields;
  const named = (Array.isArray(saved) ? (saved as unknown[]) : [])
    .filter((f): f is string => typeof f === 'string')
    .map(camel)
    .filter((f) => !changed.some((c) => c.field === f));

  const lines = [
    ...changed.map((c) => changeLine(c.field, c.from, c.to, zone)),
    ...named.map((f) => `Changed the ${FIELD_LABEL[f] ?? f.replace(/([A-Z])/g, ' $1').toLowerCase()}`),
  ];
  if (lines.length === 0) return { what: 'Edited', details: [] };
  if (lines.length === 1) return { what: lines[0], details: [] };
  return { what: `Changed ${lines.length} details`, details: lines };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describeAction(entry: EventHistoryEntry, zone: string): { what: string; details: string[] } {
  const action = entry.action.replace(/^event\./, '');
  switch (action) {
    case 'created':
      return { what: 'Created', details: [] };
    case 'updated':
      return describeEdit(entry, zone);
    case 'submitted': {
      const count = Array.isArray(entry.metadata?.reviewers) ? entry.metadata.reviewers.length : 0;
      return { what: 'Submitted for review', details: count > 0 ? [`Sent to ${plural(count, 'reviewer')}`] : [] };
    }
    case 'review_approved':
      return { what: 'Approved', details: [] };
    case 'review_changes_requested':
      return { what: 'Requested changes', details: [] };
    case 'published':
      return { what: 'Published', details: entry.metadata?.via === 'review' ? ['Every reviewer approved it'] : [] };
    case 'published_directly':
      return { what: 'Published', details: ['Without a separate review'] };
    case 'canceled':
      return { what: 'Canceled', details: [] };
    default: {
      const words = action.replace(/[._]/g, ' ').trim();
      return { what: words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Updated', details: [] };
    }
  }
}

export function formatHistoryEntry(entry: EventHistoryEntry, zone?: string | null): HistoryLine {
  const church = resolveZone(zone);
  const { what, details } = describeAction(entry, church);
  const comment = typeof entry.metadata?.comment === 'string' && entry.metadata.comment.trim() ? entry.metadata.comment.trim() : null;
  return {
    id: entry.id,
    who: entry.actorName?.trim() || 'Someone',
    what,
    details,
    comment,
    when: formatDateTime(entry.createdAt, 'en-US', church),
  };
}

/** Newest first. The API already sends it that way; equal times keep the server's order. */
export function newestFirst(entries: EventHistoryEntry[]): EventHistoryEntry[] {
  return [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
