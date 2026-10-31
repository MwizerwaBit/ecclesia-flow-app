import { describe, expect, it } from 'vitest';
import type { EventReview, EventStatus } from '@/types';
import { needsAttention, workflowState } from './state';

const STAFF = ['events:read', 'events:create', 'events:update'];
const LEADER = [...STAFF, 'events:review'];
const MEMBER = ['events:read'];

const can = (granted: string[]) => (p: string) => granted.includes(p);
const review = (userId: string, status: EventReview['status'] = 'pending'): EventReview => ({
  reviewerUserId: userId,
  reviewerName: userId,
  status,
  comment: null,
  decidedAt: null,
});

function state(status: EventStatus, granted: string[], reviews: EventReview[] = [], userId: string | null = 'me') {
  return workflowState({ event: { status, reviews }, can: can(granted), userId });
}

describe('workflowState', () => {
  it('lets staff edit, send a draft for review and cancel, but not publish', () => {
    const s = state('draft', STAFF);
    expect(s).toMatchObject({ canEdit: true, canSendForReview: true, canPublish: false, canDecide: false, canCancel: true });
    expect(s.notices).toContain('Only reviewers can publish: send it for review.');
  });

  it('lets a reviewer publish a draft directly', () => {
    const s = state('draft', LEADER);
    expect(s.canPublish).toBe(true);
    expect(s.notices).toEqual([]);
  });

  it('offers a send-back after changes were requested', () => {
    const s = state('changes_requested', STAFF);
    expect(s.canSendForReview).toBe(true);
    expect(s.notices[0]).toMatch(/asked for changes/);
  });

  it('lets only an assigned, undecided reviewer approve or request changes', () => {
    expect(state('pending_review', LEADER, [review('me')]).canDecide).toBe(true);
    expect(state('pending_review', LEADER, [review('someone')]).canDecide).toBe(false);
    expect(state('pending_review', LEADER, [review('me', 'approved')]).canDecide).toBe(false);
    expect(state('draft', LEADER, [review('me')]).canDecide).toBe(false);
    expect(state('pending_review', LEADER, [review('me')], null).canDecide).toBe(false);
  });

  it('lets a reviewer publish a pending event and tells others it is waiting', () => {
    expect(state('pending_review', LEADER, [review('x')]).canPublish).toBe(true);
    const staff = state('pending_review', STAFF, [review('x')]);
    expect(staff.canPublish).toBe(false);
    expect(staff.canSendForReview).toBe(false);
    expect(staff.notices).toContain('Waiting for the reviewers to decide.');
  });

  it('cannot publish or send what is already published', () => {
    const s = state('published', LEADER);
    expect(s).toMatchObject({ canPublish: false, canSendForReview: false, canEdit: true, canCancel: true });
  });

  it('closes everything once canceled or completed', () => {
    for (const status of ['canceled', 'completed'] as const) {
      const s = state(status, LEADER);
      expect(s).toMatchObject({ closed: true, canEdit: false, canCancel: false, canPublish: false, canSendForReview: false });
      expect(s.notices).toHaveLength(1);
    }
  });

  it('gives a read-only viewer nothing to do, and says so', () => {
    const s = state('published', MEMBER);
    expect(s).toMatchObject({ canEdit: false, canCancel: false, canPublish: false, canSendForReview: false });
    expect(s.notices).toEqual(['You can view this gathering but not change it.']);
  });
});

describe('needsAttention', () => {
  it('leads with the next step only while a gathering is in flight or waiting on you', () => {
    expect(needsAttention('draft', false)).toBe(true);
    expect(needsAttention('pending_review', false)).toBe(true);
    expect(needsAttention('changes_requested', false)).toBe(true);
    expect(needsAttention('published', true)).toBe(true);
    expect(needsAttention('published', false)).toBe(false);
    expect(needsAttention('canceled', false)).toBe(false);
  });
});
