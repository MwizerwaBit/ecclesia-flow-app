import { describe, expect, it } from 'vitest';
import type { Notification } from '@/types';
import {
  IN_APP_ALWAYS,
  NOTIFICATION_TYPE_INFO,
  NOTIFICATION_TYPE_ORDER,
  badgeLabel,
  groupByDay,
  notificationPaths,
  resolveActionUrl,
  safeInternalPath,
  surfaceOf,
} from './notifications';

function note(id: string, createdAt: string): Notification {
  return { id, userId: 'u', type: 'event', title: id, body: id, isRead: false, createdAt };
}

describe('badgeLabel', () => {
  it('shows nothing for zero, the number up to nine, and 9+ beyond', () => {
    expect(badgeLabel(0)).toBe('');
    expect(badgeLabel(-3)).toBe('');
    expect(badgeLabel(Number.NaN)).toBe('');
    expect(badgeLabel(1)).toBe('1');
    expect(badgeLabel(9)).toBe('9');
    expect(badgeLabel(10)).toBe('9+');
    expect(badgeLabel(250)).toBe('9+');
  });
});

describe('surfaceOf and notificationPaths', () => {
  it('names the area a page belongs to', () => {
    expect(surfaceOf('/staff/events/1')).toBe('staff');
    expect(surfaceOf('/staff')).toBe('staff');
    expect(surfaceOf('/board/hierarchy')).toBe('board');
    expect(surfaceOf('/portal/notifications')).toBe('portal');
    expect(surfaceOf('/')).toBe('portal');
    expect(surfaceOf('/staffer')).toBe('portal'); // a prefix of a word is not the area
  });

  it('gives each area its own inbox and settings', () => {
    expect(notificationPaths('portal')).toEqual({
      inbox: '/portal/notifications',
      preferences: '/portal/notifications/preferences',
    });
    expect(notificationPaths('staff').inbox).toBe('/staff/notifications');
    expect(notificationPaths('staff').preferences).toBe('/staff/settings/notifications');
    expect(notificationPaths('board').inbox).toBe('/board/notifications');
  });
});

describe('safeInternalPath', () => {
  it('accepts in-app paths', () => {
    expect(safeInternalPath('/staff/events/abc?tab=history')).toBe('/staff/events/abc?tab=history');
    expect(safeInternalPath('/portal/events')).toBe('/portal/events');
  });

  it.each([
    ['https://evil.example/x'],
    ['//evil.example/x'],
    ['javascript:alert(1)'],
    ['staff/events'],
    ['/staff\\evil'],
    ['/staff/events/1 2'],
    ['/staff/events/1\n'],
    ['/staff/\u0000'],
    [''],
    [null],
    [undefined],
  ])('refuses %j', (url) => {
    expect(safeInternalPath(url as string | null | undefined)).toBeNull();
  });
});

describe('resolveActionUrl', () => {
  it('sends staff and board to their own events pages instead of the member portal', () => {
    expect(resolveActionUrl('/portal/events', 'staff')).toBe('/staff/events');
    expect(resolveActionUrl('/portal/events/7', 'board')).toBe('/staff/events/7');
  });

  it('leaves everything else alone', () => {
    expect(resolveActionUrl('/portal/events', 'portal')).toBe('/portal/events');
    expect(resolveActionUrl('/staff/events/7', 'staff')).toBe('/staff/events/7');
    expect(resolveActionUrl('/portal/eventsX', 'staff')).toBe('/portal/eventsX');
  });

  it('never returns anything that is not an in-app path', () => {
    expect(resolveActionUrl('https://evil.example', 'staff')).toBeNull();
    expect(resolveActionUrl(null, 'staff')).toBeNull();
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 9, 29, 15, 0); // Thu 29 Oct 2026, 15:00 local

  it('groups newest-first notifications by how long ago they arrived, keeping their order', () => {
    const items = [
      note('a', new Date(2026, 9, 29, 14, 30).toISOString()),
      note('b', new Date(2026, 9, 29, 0, 5).toISOString()),
      note('c', new Date(2026, 9, 28, 23, 50).toISOString()),
      note('d', new Date(2026, 9, 25, 9, 0).toISOString()),
      note('e', new Date(2026, 9, 20, 9, 0).toISOString()),
      note('f', new Date(2026, 8, 1, 9, 0).toISOString()),
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'This week', 'Earlier']);
    expect(groups.map((g) => g.items.map((n) => n.id))).toEqual([['a', 'b'], ['c'], ['d'], ['e', 'f']]);
  });

  it('has no empty groups and copes with nothing', () => {
    expect(groupByDay([], now)).toEqual([]);
    expect(groupByDay([note('x', new Date(2026, 9, 29, 8, 0).toISOString())], now).map((g) => g.label)).toEqual(['Today']);
  });
});

describe('notification types', () => {
  it('describes every type the API knows', () => {
    expect(NOTIFICATION_TYPE_ORDER.sort()).toEqual(
      ['announcement', 'approval', 'billing', 'event', 'finance_alert', 'manual', 'pastoral_alert', 'reminder', 'system'].sort(),
    );
    for (const type of NOTIFICATION_TYPE_ORDER) {
      expect(NOTIFICATION_TYPE_INFO[type].label.length).toBeGreaterThan(0);
    }
  });

  it('keeps the in-app copy of approvals and billing on, as the server does', () => {
    expect([...IN_APP_ALWAYS].sort()).toEqual(['approval', 'billing']);
  });
});
