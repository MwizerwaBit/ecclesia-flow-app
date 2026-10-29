/**
 * @file WorkflowActions.tsx
 * @description What a person can do next with a gathering: send it for review,
 * publish, approve or ask for changes, edit, cancel.
 *
 * Which actions show is decided by `workflowState` (status + permission); when one
 * is unavailable the reason is said in a sentence instead of leaving a gap. Every
 * action refreshes both the lists (`['events']`) and this gathering (`['event', id]`).
 * Failures are shown here, next to the action; in demo mode the review actions
 * answer 501 and the message says they need the API.
 *
 * `layout="banner"` is the full-width card above the page for a gathering that
 * needs a decision; `layout="panel"` is the quiet stack in the side column.
 */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, MessageSquareWarning, Pencil, Rocket, Send } from 'lucide-react';
import type { ChurchEvent } from '@/types';
import { eventsService } from '@/services/eventsService';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { cn } from '@/lib/cn';
import { ConfirmSheet } from './ConfirmSheet';
import { SendForReviewSheet } from './SendForReviewSheet';
import { invalidateEvent } from './invalidate';
import { workflowState } from './state';

type Action =
  | { kind: 'send'; reviewerUserIds: string[] }
  | { kind: 'publish' }
  | { kind: 'approve' }
  | { kind: 'changes'; comment: string }
  | { kind: 'cancel' };

type Sheet = 'send' | 'publish' | 'changes' | 'cancel' | null;

const DONE: Record<Action['kind'], string> = {
  send: 'Sent for review',
  publish: 'Published',
  approve: 'Approved',
  changes: 'Changes requested',
  cancel: 'Canceled',
};

interface WorkflowActionsProps {
  event: ChurchEvent;
  layout: 'banner' | 'panel';
}

export function WorkflowActions({ event, layout }: WorkflowActionsProps) {
  const queryClient = useQueryClient();
  const { can } = useRole();
  const user = useCurrentUser();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [comment, setComment] = useState('');

  const state = workflowState({ event, can, userId: user?.id ?? null });

  // Stable identity: the sheets take it as onClose, and a new one every render
  // (each keystroke in the comment box) must not look like a new sheet.
  const close = useCallback(() => {
    setSheet(null);
    setComment('');
  }, []);

  const run = useMutation({
    mutationFn: (action: Action) => {
      switch (action.kind) {
        case 'send':
          return eventsService.submitForReview(event.id, action.reviewerUserIds);
        case 'publish':
          return eventsService.publish(event.id);
        case 'approve':
          return eventsService.review(event.id, 'approved');
        case 'changes':
          return eventsService.review(event.id, 'changes_requested', action.comment);
        case 'cancel':
          return eventsService.cancel(event.id);
      }
    },
    // Shown beside the action (see ErrorNotice), not as a second toast.
    meta: { inline: true },
    onSuccess: (_saved, action) => {
      void invalidateEvent(queryClient, event.id);
      toast.success(DONE[action.kind]);
      close();
    },
  });

  function open(next: Exclude<Sheet, null>) {
    run.reset();
    setSheet(next);
  }

  const hasActions =
    state.canSendForReview || state.canPublish || state.canDecide || state.canEdit || state.canCancel;
  if (!hasActions && state.notices.length === 0) return null;

  const banner = layout === 'banner';
  const fullWidth = !banner;
  // Errors from an action with no sheet (Approve) show here; the others show in their sheet.
  const inlineError = sheet === null ? run.error : null;

  return (
    <>
      <Card
        variant={banner ? 'elevated' : 'outline'}
        padding="md"
        accent={banner && !state.closed ? 'warning' : 'none'}
        className="space-y-3"
      >
        <Text variant="label" color="muted">
          {banner ? 'Next step' : 'Manage'}
        </Text>

        {state.notices.length > 0 && (
          <div className="space-y-1">
            {state.notices.map((notice) => (
              <Text key={notice} variant="body-sm">
                {notice}
              </Text>
            ))}
          </div>
        )}

        {state.canEdit && event.status === 'pending_review' && (
          <Text variant="caption" color="muted">
            Editing a gathering that is waiting for review sends it back to draft, and its reviewers start again.
          </Text>
        )}

        <div className={cn('flex gap-2', banner ? 'flex-wrap' : 'flex-col')}>
          {state.canSendForReview && (
            <Button variant="primary" fullWidth={fullWidth} leftIcon={Send} onClick={() => open('send')}>
              {event.status === 'changes_requested' ? 'Send for review again' : 'Send for review'}
            </Button>
          )}
          {state.canDecide && (
            <>
              <Button
                variant="primary"
                fullWidth={fullWidth}
                leftIcon={Check}
                isLoading={run.isPending && run.variables?.kind === 'approve'}
                disabled={run.isPending}
                onClick={() => run.mutate({ kind: 'approve' })}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                fullWidth={fullWidth}
                leftIcon={MessageSquareWarning}
                onClick={() => open('changes')}
              >
                Request changes
              </Button>
            </>
          )}
          {state.canPublish && (
            <Button
              variant={state.canSendForReview || state.canDecide ? 'secondary' : 'primary'}
              fullWidth={fullWidth}
              leftIcon={Rocket}
              onClick={() => open('publish')}
            >
              Publish
            </Button>
          )}
          {state.canEdit && (
            <Link to={`/staff/events/${event.id}/edit`}>
              <Button variant="ghost" fullWidth={fullWidth} leftIcon={Pencil}>
                Edit this gathering
              </Button>
            </Link>
          )}
          {state.canCancel && (
            <Button
              variant="ghost"
              fullWidth={fullWidth}
              leftIcon={Ban}
              className="text-danger hover:text-danger dark:text-danger"
              onClick={() => open('cancel')}
            >
              Cancel this gathering
            </Button>
          )}
        </div>

        <div aria-live="polite">{inlineError ? <ErrorNotice error={inlineError} /> : null}</div>
      </Card>

      {sheet === 'send' && (
        <SendForReviewSheet
          onClose={close}
          onSend={(reviewerUserIds) => run.mutate({ kind: 'send', reviewerUserIds })}
          isPending={run.isPending}
          error={run.error}
        />
      )}

      <ConfirmSheet
        open={sheet === 'publish'}
        onClose={close}
        title="Publish this gathering?"
        description={
          event.status === 'pending_review'
            ? 'It goes live now, without waiting for the reviewers who have not decided yet.'
            : 'It goes live now, to everyone who is allowed to see it.'
        }
        confirmLabel="Publish"
        onConfirm={() => run.mutate({ kind: 'publish' })}
        isPending={run.isPending}
        error={run.error}
      />

      <ConfirmSheet
        open={sheet === 'changes'}
        onClose={close}
        title="Request changes"
        description="Say what should change. The person who sent it sees your note."
        confirmLabel="Send back"
        confirmDisabled={comment.trim().length === 0}
        onConfirm={() => run.mutate({ kind: 'changes', comment: comment.trim() })}
        isPending={run.isPending}
        error={run.error}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-comment" className="text-label text-slate-700 dark:text-slate-300">
            What should change?
          </label>
          <textarea
            id="review-comment"
            rows={4}
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </ConfirmSheet>

      <ConfirmSheet
        open={sheet === 'cancel'}
        onClose={close}
        title="Cancel this gathering?"
        description={
          event.isRecurring
            ? 'This cancels the whole series, every date of it, not just the next one. It cannot be undone.'
            : 'This cancels the gathering for everyone. It cannot be undone.'
        }
        confirmLabel="Cancel the gathering"
        destructive
        onConfirm={() => run.mutate({ kind: 'cancel' })}
        isPending={run.isPending}
        error={run.error}
      />
    </>
  );
}
