/**
 * @file state.ts
 * @description Which workflow actions a gathering offers this person, and why not.
 *
 * Pure, so the rules can be tested without a screen. It mirrors the API's rules
 * (events/service.py) to decide what to *show*; the API still decides what is
 * allowed, and its answer is shown if the two ever disagree.
 */
import type { ChurchEvent, EventStatus } from '@/types';

export interface WorkflowInput {
  event: Pick<ChurchEvent, 'status' | 'reviews'>;
  can: (permission: string) => boolean;
  /** The signed-in user's id, to find their own review among the assigned ones. */
  userId: string | null;
}

export interface WorkflowState {
  /** Canceled or completed: nothing about it can change any more. */
  closed: boolean;
  canEdit: boolean;
  canSendForReview: boolean;
  canPublish: boolean;
  /** Assigned to this person and still waiting on their decision. */
  canDecide: boolean;
  canCancel: boolean;
  /** Sentences that stand in for a missing action. */
  notices: string[];
}

const PUBLISHABLE: EventStatus[] = ['draft', 'changes_requested', 'pending_review'];

export function workflowState({ event, can, userId }: WorkflowInput): WorkflowState {
  const { status } = event;
  const closed = status === 'canceled' || status === 'completed';
  const mayUpdate = can('events:update');
  const mayReview = can('events:review');

  const canDecide =
    status === 'pending_review' &&
    userId !== null &&
    (event.reviews ?? []).some((r) => r.reviewerUserId === userId && r.status === 'pending');
  const canPublish = mayReview && PUBLISHABLE.includes(status);

  const notices: string[] = [];
  if (closed) {
    notices.push(
      status === 'canceled'
        ? 'This gathering is canceled. A canceled gathering cannot be edited or published again.'
        : 'This gathering is completed, so it can no longer be edited or canceled.',
    );
  } else {
    if (status === 'changes_requested') {
      notices.push('A reviewer asked for changes. Edit the gathering, then send it for review again.');
    }
    if (!mayReview && (status === 'draft' || status === 'changes_requested')) {
      notices.push('Only reviewers can publish: send it for review.');
    }
    if (status === 'pending_review' && !canDecide && !mayReview) {
      notices.push('Waiting for the reviewers to decide.');
    }
    if (!mayUpdate && !mayReview) notices.push('You can view this gathering but not change it.');
  }

  return {
    closed,
    canEdit: mayUpdate && !closed,
    canSendForReview: mayUpdate && (status === 'draft' || status === 'changes_requested'),
    canPublish,
    canDecide,
    canCancel: mayUpdate && !closed,
    notices,
  };
}

/** A gathering that is still moving (or waiting on this person) leads its screen with the next step. */
export function needsAttention(status: EventStatus, canDecide: boolean): boolean {
  return status === 'draft' || status === 'pending_review' || status === 'changes_requested' || canDecide;
}
