/**
 * @file CollisionNotice.tsx
 * @description Other groups' gatherings this one would overlap.
 *
 * Shown as soon as a group and a start time are picked, so the clash is seen
 * before saving. Asking a leader which gathering they will attend needs the
 * saved gathering, so that button only appears when editing.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, Users } from 'lucide-react';
import type { EventCollision } from '@/types';
import { eventsService } from '@/services/eventsService';
import { formatDateTime } from '@/lib/formatters';
import { Avatar, Badge, Button, Card, Text } from '@/components/ui';

interface CollisionNoticeProps {
  collisions: EventCollision[];
  /** The saved gathering, when editing. */
  eventId?: string;
  zone: string;
}

export function CollisionNotice({ collisions, eventId, zone }: CollisionNoticeProps) {
  const queryClient = useQueryClient();

  const notify = useMutation({
    mutationFn: ({ collidingEventId, memberIds }: { collidingEventId: string; memberIds: string[] }) =>
      eventsService.notifyConflict(eventId ?? '', collidingEventId, memberIds),
    meta: { inline: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', 'collisions'] }),
  });

  if (collisions.length === 0) return null;

  return (
    <Card accent="warning" variant="outline" padding="md" className="space-y-3" role="status">
      <Text variant="label" className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
        <AlertTriangle size={14} className="shrink-0 text-warning" aria-hidden /> Schedule clash
      </Text>
      {collisions.map((c) => (
        <div key={c.eventId} className="space-y-2 border-t border-warning/20 pt-2 first:border-t-0 first:pt-0">
          <Text variant="body-sm">
            Overlaps <strong>{c.eventTitle}</strong> ({c.groupName}, {formatDateTime(c.startDateTime, 'en-US', zone)}) —
            about {c.affectedMemberCount} {c.affectedMemberCount === 1 ? 'person is' : 'people are'} in both groups.
          </Text>
          {c.keyParticipants.length > 0 && (
            <div className="space-y-1.5">
              {c.keyParticipants.map((kp) => (
                <div key={kp.memberId} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Avatar name={kp.name} size="xs" />
                    <Text variant="caption" className="truncate">
                      {kp.name} leads {kp.groupName}
                    </Text>
                    <Badge variant="warning" size="sm">
                      <Users size={10} aria-hidden /> Key
                    </Badge>
                  </span>
                  {eventId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={Bell}
                      isLoading={notify.isPending && notify.variables?.memberIds[0] === kp.memberId}
                      onClick={() => notify.mutate({ collidingEventId: c.eventId, memberIds: [kp.memberId] })}
                    >
                      Ask them
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {!eventId && (
        <Text variant="caption" color="muted" className="block">
          Save the gathering first to notify a leader directly.
        </Text>
      )}
      {notify.isError && (
        <Text variant="caption" color="danger" role="alert" className="block">
          Couldn’t send that request. Try again.
        </Text>
      )}
    </Card>
  );
}
