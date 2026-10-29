import { describe, expect, it } from 'vitest';
import type { EventHistoryEntry } from '@/types';
import { formatHistoryEntry, newestFirst } from './history';

function entry(action: string, metadata: EventHistoryEntry['metadata'] = null, extra: Partial<EventHistoryEntry> = {}): EventHistoryEntry {
  return { id: 'h1', action, actorName: 'Grace Uwase', createdAt: '2026-03-01T07:00:00Z', metadata, ...extra };
}

describe('formatHistoryEntry', () => {
  it('names who and when, on the church clock', () => {
    const line = formatHistoryEntry(entry('event.created'), 'Africa/Kigali');
    expect(line.who).toBe('Grace Uwase');
    expect(line.what).toBe('Created');
    expect(line.when).toBe('Mar 1, 2026 at 9:00 AM');
    expect(formatHistoryEntry(entry('event.created'), 'UTC').when).toBe('Mar 1, 2026 at 7:00 AM');
  });

  it('falls back when nobody is named', () => {
    expect(formatHistoryEntry(entry('event.created', null, { actorName: null }), 'UTC').who).toBe('Someone');
  });

  it('reads a single change as the sentence itself', () => {
    const line = formatHistoryEntry(
      entry('event.updated', { changed: { title: { from: 'Sunday Service', to: 'Morning Service' } } }),
      'UTC',
    );
    expect(line.what).toBe('Changed title from "Sunday Service" to "Morning Service"');
    expect(line.details).toEqual([]);
  });

  it('shows camelCased time changes in the church zone', () => {
    const line = formatHistoryEntry(
      entry('event.updated', {
        changed: { startDateTime: { from: '2026-03-01T07:00:00+00:00', to: '2026-03-01T09:30:00+00:00' } },
      }),
      'Africa/Kigali',
    );
    expect(line.what).toBe('Changed start from Mar 1, 2026 at 9:00 AM to Mar 1, 2026 at 11:30 AM');
  });

  it('accepts snake_case field names too', () => {
    const line = formatHistoryEntry(
      entry('event.updated', { changed: { end_date_time: { from: null, to: '2026-03-01T10:00:00Z' } } }),
      'UTC',
    );
    expect(line.what).toBe('Set end to Mar 1, 2026 at 10:00 AM');
  });

  it('summarises several changes and lists them', () => {
    const line = formatHistoryEntry(
      entry('event.updated', {
        changed: {
          location: { from: 'Hall', to: null },
          visibility: { from: 'members', to: 'public' },
          groupId: { from: 'g1', to: 'g2' },
          recurrenceRule: { from: null, to: 'FREQ=WEEKLY;BYDAY=SU' },
        },
        fields: ['description', 'location'],
      }),
      'UTC',
    );
    expect(line.what).toBe('Changed 5 details');
    expect(line.details).toEqual([
      'Cleared the location (was "Hall")',
      'Changed visibility from Members to Public',
      'Changed the group',
      'Set repeat schedule to every sunday',
      'Changed the description',
    ]);
  });

  it('handles all-day toggles and edits with nothing diffed', () => {
    expect(formatHistoryEntry(entry('event.updated', { changed: { isAllDay: { from: false, to: true } } }), 'UTC').what).toBe(
      'Made it an all-day gathering',
    );
    expect(formatHistoryEntry(entry('event.updated', { changed: {} }), 'UTC').what).toBe('Edited');
  });

  it('describes the review workflow', () => {
    expect(formatHistoryEntry(entry('event.submitted', { reviewers: ['a', 'b'] }), 'UTC')).toMatchObject({
      what: 'Submitted for review',
      details: ['Sent to 2 reviewers'],
    });
    expect(formatHistoryEntry(entry('event.submitted', { reviewers: ['a'] }), 'UTC').details).toEqual(['Sent to 1 reviewer']);
    expect(formatHistoryEntry(entry('event.review_approved', { comment: null }), 'UTC')).toMatchObject({
      what: 'Approved',
      comment: null,
    });
    expect(formatHistoryEntry(entry('event.review_changes_requested', { comment: ' Move it to 10am ' }), 'UTC')).toMatchObject({
      what: 'Requested changes',
      comment: 'Move it to 10am',
    });
    expect(formatHistoryEntry(entry('event.published', { via: 'review' }), 'UTC').what).toBe('Published');
    expect(formatHistoryEntry(entry('event.published_directly'), 'UTC').details).toEqual(['Without a separate review']);
    expect(formatHistoryEntry(entry('event.canceled'), 'UTC').what).toBe('Canceled');
  });

  it('does not break on an action it has not heard of', () => {
    expect(formatHistoryEntry(entry('event.moved_to_archive'), 'UTC').what).toBe('Moved to archive');
  });
});

describe('newestFirst', () => {
  it('sorts by time and keeps the order the API sent on a tie', () => {
    const a = entry('event.created', null, { id: 'a', createdAt: '2026-03-01T07:00:00Z' });
    const b = entry('event.published', null, { id: 'b', createdAt: '2026-03-02T07:00:00Z' });
    const c = entry('event.review_approved', null, { id: 'c', createdAt: '2026-03-02T07:00:00Z' });
    expect(newestFirst([a, b, c]).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
});
