/**
 * @file SendForReviewSheet.tsx
 * @description Pick one to five reviewers, then send the gathering for review.
 *
 * Reviewers are the team members whose role may review events (never yourself).
 * The gathering publishes once every one of them has approved, so the person
 * sending chooses who they are waiting on. Mount it when needed: its choices
 * start empty each time.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserX } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Button, Checkbox, EmptyState, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { ConfirmSheet } from './ConfirmSheet';

export const MAX_REVIEWERS = 5;

interface SendForReviewSheetProps {
  onClose: () => void;
  onSend: (reviewerUserIds: string[]) => void;
  isPending: boolean;
  error: unknown;
}

export function SendForReviewSheet({ onClose, onSend, isPending, error }: SendForReviewSheetProps) {
  const [chosen, setChosen] = useState<string[]>([]);

  const options = useQuery({
    queryKey: ['events', 'reviewer-options'],
    queryFn: () => eventsService.reviewerOptions(),
  });

  function toggle(userId: string) {
    setChosen((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : current.length < MAX_REVIEWERS
          ? [...current, userId]
          : current,
    );
  }

  const reviewers = options.data ?? [];
  const full = chosen.length >= MAX_REVIEWERS;

  return (
    <ConfirmSheet
      open
      onClose={onClose}
      title="Send for review"
      description={`Choose up to ${MAX_REVIEWERS} people. It publishes once every one of them approves.`}
      confirmLabel="Send for review"
      confirmDisabled={chosen.length === 0}
      onConfirm={() => onSend(chosen)}
      isPending={isPending}
      error={error}
    >
      <div aria-live="polite" aria-busy={options.isLoading}>
        {options.isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading reviewers">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        )}

        {options.isError && (
          <div className="space-y-3">
            <ErrorNotice error={options.error} />
            <Button variant="secondary" size="sm" onClick={() => void options.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {options.isSuccess && reviewers.length === 0 && (
          <EmptyState
            icon={UserX}
            title="No one can review yet"
            description="Ask your church leader to give someone on the team permission to review events."
            className="py-6"
          />
        )}

        {reviewers.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="sr-only">Reviewers</legend>
            {reviewers.map((person) => {
              const checked = chosen.includes(person.userId);
              return (
                <div key={person.userId} className="min-h-11 flex items-center">
                  <Checkbox
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggle(person.userId)}
                    label={person.name}
                    description={person.roleName}
                  />
                </div>
              );
            })}
          </fieldset>
        )}
      </div>

      {reviewers.length > 0 && (
        <Text variant="caption" color="muted" className="tabular-nums">
          {chosen.length} of {MAX_REVIEWERS} chosen
        </Text>
      )}
    </ConfirmSheet>
  );
}
