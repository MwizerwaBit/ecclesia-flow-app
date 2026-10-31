/**
 * @file events.ts
 * @description Words and colours for events, in one place so a staff card, a
 * member card, a calendar chip and a public page all say the same thing.
 */
import type { EventStatus, EventType, EventVisibility } from '@/types';

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  service: 'Service',
  meeting: 'Meeting',
  event: 'Event',
  prayer: 'Prayer',
  outreach: 'Outreach',
  other: 'Other',
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  pending_review: 'Waiting for review',
  changes_requested: 'Changes requested',
  published: 'Published',
  canceled: 'Canceled',
  completed: 'Completed',
};

export const EVENT_VISIBILITY_LABEL: Record<EventVisibility, string> = {
  public: 'Public',
  members: 'Members',
  private: 'Group only',
};

/** Who can see it, in a sentence, for forms and detail screens. */
export const EVENT_VISIBILITY_HELP: Record<EventVisibility, string> = {
  public: 'Anyone can see it, including on your church page.',
  members: 'Everyone signed in to your church can see it.',
  private: 'Only people in one group can see it.',
};

export type EventAccent = 'none' | 'primary' | 'success' | 'warning' | 'danger';

/**
 * The colored left border for an event row or chip (the `accent` prop of Card).
 * Status that needs attention wins; otherwise the type gives a calm default.
 * `Card` supports only these four colors, so that is all this can return.
 */
export function eventAccent(status: EventStatus, type: EventType): EventAccent {
  if (status === 'canceled') return 'danger';
  if (status === 'draft' || status === 'pending_review' || status === 'changes_requested') return 'warning';
  if (status === 'completed') return 'none';
  return type === 'outreach' ? 'success' : type === 'service' || type === 'prayer' ? 'primary' : 'none';
}

