/**
 * @file ReviewQueue.tsx
 * @description Gatherings waiting for *my* decision before they publish.
 *
 * "Request changes" requires a reason — the organiser otherwise has nothing
 * to act on — while "Approve" needs none, mirroring the 422 the API itself
 * returns for a reason-less rejection (see events/service.py's review flow).
 * A gathering publishes only once every assigned reviewer has approved, so
 * approving here does not always publish it.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, X } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { EventCard } from '@/components/events/EventCard';
import { invalidateEvent } from '@/components/events/workflow/invalidate';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { Button, EmptyState, Input, Skeleton, Text } from '@/components/ui';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { toast } from '@/hooks/useToastStore';
import { EVENT_TYPE_LABEL } from '@/lib/events';

function ReviewRow({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [requestingChanges, setRequestingChanges] = useState(false);

  const decide = useMutation({
    mutationFn: (args: { decision: 'approved' | 'changes_requested'; comment?: string }) =>
      eventsService.review(eventId, args.decision, args.comment),
    // The decision is explained next to the buttons, not as a second toast.
    meta: { inline: true },
    onSuccess: (_saved, args) => {
      void invalidateEvent(queryClient, eventId);
      toast.success(args.decision === 'approved' ? 'Approved' : 'Sent back with your note');
    },
  });

  return (
    <div className="space-y-2">
      {!requestingChanges ? (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            leftIcon={Check}
            isLoading={decide.isPending}
            onClick={() => decide.mutate({ decision: 'approved' })}
          >
            Approve
          </Button>
          <Button variant="ghost" size="sm" leftIcon={X} onClick={() => setRequestingChanges(true)}>
            Request changes
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            label={`What should change before "${eventTitle}" publishes?`}
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              disabled={comment.trim().length === 0}
              isLoading={decide.isPending}
              onClick={() => decide.mutate({ decision: 'changes_requested', comment: comment.trim() })}
            >
              Send back
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRequestingChanges(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div aria-live="polite">{decide.error ? <ErrorNotice error={decide.error} /> : null}</div>
    </div>
  );
}

export function ReviewQueue() {
  const zone = useChurchTimeZone();
  const {
    data: queue = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', 'review-queue'],
    queryFn: () => eventsService.reviewQueue(),
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Reviews
        </Text>
        <Text variant="body" color="muted">
          Gatherings waiting on your approval before they go live.
        </Text>
      </header>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading reviews">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <ErrorNotice error={error} />
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && queue.length === 0 && (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Everything submitted so far has been decided." />
        )}
      </div>

      <div className="space-y-3">
        {queue.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            href={`/staff/events/${event.id}`}
            typeLabel={EVENT_TYPE_LABEL[event.type]}
            timeZone={zone}
            actions={<ReviewRow eventId={event.id} eventTitle={event.title} />}
          />
        ))}
      </div>
    </div>
  );
}
