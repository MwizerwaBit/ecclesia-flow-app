/**
 * @file ReviewQueue.tsx
 * @description Gatherings waiting for *my* decision before they publish.
 *
 * "Request changes" requires a reason — the organiser otherwise has nothing
 * to act on — while "Approve" needs none, mirroring the 422 the API itself
 * returns for a reason-less rejection (see events/service.py's review flow).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, X } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { EventCard } from '@/components/events/EventCard';
import { ApiError } from '@/services/adapter';
import { Button, EmptyState, Input, Text } from '@/components/ui';

function ReviewRow({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: (args: { decision: 'approved' | 'changes_requested'; comment?: string }) =>
      eventsService.review(eventId, args.decision, args.comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', 'review-queue'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not record that decision'),
  });

  return (
    <div className="space-y-2">
      {!requestingChanges ? (
        <div className="flex gap-2">
          <Button variant="primary" size="sm" fullWidth leftIcon={Check} isLoading={decide.isPending} onClick={() => decide.mutate({ decision: 'approved' })}>
            Approve &amp; publish
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
      {error && (
        <Text variant="body-sm" className="text-danger">
          {error}
        </Text>
      )}
    </div>
  );
}

export function ReviewQueue() {
  const { data: queue = [], isLoading } = useQuery({
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

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading…
        </Text>
      )}

      {!isLoading && queue.length === 0 && (
        <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Everything submitted so far has been decided." />
      )}

      <div className="space-y-3">
        {queue.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            href={`/staff/events/${event.id}`}
            typeLabel={event.type}
            actions={<ReviewRow eventId={event.id} eventTitle={event.title} />}
          />
        ))}
      </div>
    </div>
  );
}
