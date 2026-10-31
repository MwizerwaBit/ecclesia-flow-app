/**
 * @file notifications.ts
 * @description What a notification looks like and where it leads — pure helpers, no React.
 */
import {
  Bell,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  HeartHandshake,
  Info,
  Megaphone,
  MessageSquare,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';

/** The three signed-in areas; each has its own layout and its own notification pages. */
export type Surface = 'portal' | 'staff' | 'board';

export interface NotificationTypeInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Only people who run the church receive these; members don't see them in settings. */
  staffOnly?: boolean;
}

/** In the order they are shown in settings: the ones that happen today first. */
export const NOTIFICATION_TYPE_INFO: Record<NotificationType, NotificationTypeInfo> = {
  event: {
    label: 'Gatherings',
    description: 'A gathering you’re part of was published, changed or canceled',
    icon: CalendarDays,
  },
  reminder: {
    label: 'Reminders',
    description: 'A gathering is starting soon — a day before and an hour before',
    icon: BellRing,
  },
  manual: {
    label: 'Messages from your church',
    description: 'A short notice sent to you by the church’s staff',
    icon: MessageSquare,
  },
  approval: {
    label: 'Approvals',
    description: 'Something needs your decision, or one you started has moved on',
    icon: ClipboardCheck,
    staffOnly: true,
  },
  billing: {
    label: 'Plan and payments',
    description: 'A payment was decided, or the plan is about to end',
    icon: CreditCard,
    staffOnly: true,
  },
  announcement: {
    label: 'Announcements',
    description: 'Anything published to the congregation',
    icon: Megaphone,
  },
  system: {
    label: 'System',
    description: 'Notices about the app itself',
    icon: Info,
  },
  pastoral_alert: {
    label: 'Pastoral alerts',
    description: 'A member hasn’t been seen, or a visitor is waiting for follow-up',
    icon: HeartHandshake,
    staffOnly: true,
  },
  finance_alert: {
    label: 'Giving alerts',
    description: 'A batch is left open, or a giving discrepancy is recorded',
    icon: Wallet,
    staffOnly: true,
  },
};

export const NOTIFICATION_TYPE_ORDER = Object.keys(NOTIFICATION_TYPE_INFO) as NotificationType[];

/** Types whose in-app copy can't be switched off (the server refuses it too). */
export const IN_APP_ALWAYS: ReadonlySet<NotificationType> = new Set<NotificationType>(['approval', 'billing']);

export function iconFor(type: string): LucideIcon {
  return NOTIFICATION_TYPE_INFO[type as NotificationType]?.icon ?? Bell;
}

// ─── Where things are ─────────────────────────────────────────────────────────

export function surfaceOf(pathname: string): Surface {
  if (pathname === '/board' || pathname.startsWith('/board/')) return 'board';
  if (pathname === '/staff' || pathname.startsWith('/staff/')) return 'staff';
  return 'portal';
}

export function notificationPaths(surface: Surface): { inbox: string; preferences: string } {
  switch (surface) {
    case 'staff':
      return { inbox: '/staff/notifications', preferences: '/staff/settings/notifications' };
    case 'board':
      return { inbox: '/board/notifications', preferences: '/board/notifications/preferences' };
    default:
      return { inbox: '/portal/notifications', preferences: '/portal/notifications/preferences' };
  }
}

/** An in-app path and nothing else: no scheme, no host, no "//". The server only sends these;
 *  checking again here means a bad row can never turn a tap into a link off the site. */
export function safeInternalPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
  // Whitespace and control characters (anything at or below a space) never belong in a path.
  if ([...url].some((ch) => ch.charCodeAt(0) <= 32 || ch.charCodeAt(0) === 127)) return null;
  return url;
}

/**
 * Where tapping a notification goes for the person reading it. Links are written for the
 * member portal where that is the common page (e.g. /portal/events); someone reading on the
 * staff or board surface is sent to that surface's own equivalent instead of being bounced.
 */
export function resolveActionUrl(actionUrl: string | null | undefined, surface: Surface): string | null {
  const url = safeInternalPath(actionUrl);
  if (!url) return null;
  if (surface !== 'portal' && (url === '/portal/events' || url.startsWith('/portal/events/'))) {
    return url.replace('/portal/events', '/staff/events');
  }
  return url;
}

// ─── Display ──────────────────────────────────────────────────────────────────

/** What goes on the bell: nothing for zero, "9+" beyond nine. */
export function badgeLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}

export interface NotificationGroup {
  label: string;
  items: Notification[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Newest-first notifications grouped by when they arrived: Today, Yesterday, This week, Earlier.
 *  Order inside a group, and between groups, is the order given. */
export function groupByDay(items: Notification[], now: Date = new Date()): NotificationGroup[] {
  const today = startOfDay(now);
  const buckets = new Map<string, Notification[]>();
  for (const item of items) {
    const age = Math.round((today - startOfDay(new Date(item.createdAt))) / DAY_MS);
    const label = age <= 0 ? 'Today' : age === 1 ? 'Yesterday' : age < 7 ? 'This week' : 'Earlier';
    const bucket = buckets.get(label);
    if (bucket) bucket.push(item);
    else buckets.set(label, [item]);
  }
  return [...buckets].map(([label, groupItems]) => ({ label, items: groupItems }));
}
