/**
 * @file EventBadges.tsx
 * @description Small status and visibility badges for staff views of a gathering.
 *
 * Published is the normal state, so it stays unmarked on a card (`quietPublished`):
 * a badge on everything is a badge on nothing. Visibility is shown for every
 * gathering because "who can see this" is the question staff actually have.
 */
import { Eye, Lock, Users } from 'lucide-react';
import type { EventStatus, EventVisibility } from '@/types';
import { Badge, StatusBadge } from '@/components/ui';
import { EVENT_VISIBILITY_LABEL } from '@/lib/events';

const VISIBILITY_ICON = { public: Eye, members: Users, private: Lock } as const;

export function VisibilityBadge({ visibility, size = 'sm' }: { visibility: EventVisibility; size?: 'sm' | 'md' }) {
  const Icon = VISIBILITY_ICON[visibility];
  return (
    <Badge variant="neutral" size={size}>
      <Icon size={11} aria-hidden />
      {EVENT_VISIBILITY_LABEL[visibility]}
    </Badge>
  );
}

export function EventStatusBadge({
  status,
  size = 'sm',
  quietPublished = false,
}: {
  status: EventStatus;
  size?: 'sm' | 'md';
  quietPublished?: boolean;
}) {
  if (quietPublished && status === 'published') return null;
  return <StatusBadge status={status} size={size} />;
}
