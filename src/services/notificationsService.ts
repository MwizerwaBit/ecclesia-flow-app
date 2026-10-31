/**
 * @file notificationsService.ts
 * @description Notifications: a person's own (list, unread count, read state, preferences) and
 * sending one to members.
 *
 * Needs the real API: there is no demo-mode version of "tell a congregation", and a bell with
 * invented rows would be worse than none.
 */
import type {
  BroadcastResult,
  Notification,
  NotificationChannel,
  NotificationPage,
  NotificationPreferences,
  NotificationPreferencesPatch,
  NotificationStatusFilter,
  NotificationType,
  SendAudience,
  SendEstimate,
} from '@/types';
import { apiRequest, apiRequestPage, requireApi } from './adapter';

export interface SendNotificationInput {
  /** One per send, made when the form opens. Sending again with the same key (a double
   *  click, a retry) returns the first result and sends nothing. */
  requestKey: string;
  title: string;
  body: string;
  audience: SendAudience;
}

/** Longest title and message the API accepts. */
export const TITLE_MAX = 150;
export const BODY_MAX = 1000;

/** A fresh key for one send: letters, digits and dashes, as the API requires. */
export function newRequestKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The API sends and accepts preference keys like `pastoral_alert` / `in_app`; the transport turns every
 *  key into camelCase on the way in, so the type and channel names are put back here. */
const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function rekeyPreferences(raw: Record<string, Record<string, boolean>> | undefined | null) {
  const out: Record<string, Record<string, boolean>> = {};
  for (const [type, channels] of Object.entries(raw ?? {})) {
    out[toSnake(type)] = Object.fromEntries(Object.entries(channels ?? {}).map(([c, on]) => [toSnake(c), on]));
  }
  return out as Record<NotificationType, Record<NotificationChannel, boolean>>;
}

export interface ListNotificationsParams {
  status?: NotificationStatusFilter;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export const notificationsService = {
  /** One page, newest first, with the total (for "load more"). */
  async list({ status = 'all', type, limit = 20, offset = 0 }: ListNotificationsParams = {}): Promise<NotificationPage> {
    requireApi('Notifications');
    const query = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    if (type) query.set('type', type);
    return apiRequestPage<Notification>(`/notifications?${query}`);
  },

  async unreadCount(): Promise<number> {
    requireApi('Notifications');
    return (await apiRequest<{ count: number }>('/notifications/unread-count')).count;
  },

  /** Read or unread. Reading twice changes nothing, so it is safe to retry. */
  async setRead(id: string, isRead: boolean): Promise<Notification> {
    requireApi('Notifications');
    return apiRequest<Notification>(`/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead }) });
  },

  async markAllRead(): Promise<void> {
    requireApi('Notifications');
    await apiRequest<void>('/notifications/mark-all-read', { method: 'POST' });
  },

  async getPreferences(): Promise<NotificationPreferences> {
    requireApi('Notification settings');
    const raw = await apiRequest<{ userId: string; preferences: Record<string, Record<string, boolean>> }>(
      '/notification-preferences',
    );
    return { userId: raw.userId, preferences: rekeyPreferences(raw.preferences) };
  },

  /** Changes only what is named; everything else keeps its value. */
  async updatePreferences(patch: NotificationPreferencesPatch): Promise<NotificationPreferences> {
    requireApi('Notification settings');
    const raw = await apiRequest<{ userId: string; preferences: Record<string, Record<string, boolean>> }>(
      '/notification-preferences',
      { method: 'PUT', body: JSON.stringify({ preferences: patch }) },
    );
    return { userId: raw.userId, preferences: rekeyPreferences(raw.preferences) };
  },

  /** Counts only (members, how many have a login), limited to what the signed-in person may reach. */
  async estimateSend(audience: SendAudience): Promise<SendEstimate> {
    requireApi('Sending a notification');
    return apiRequest<SendEstimate>('/notifications/send/audience-estimate', {
      method: 'POST',
      body: JSON.stringify(audience),
    });
  },

  async send(input: SendNotificationInput): Promise<BroadcastResult> {
    requireApi('Sending a notification');
    return apiRequest<BroadcastResult>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
