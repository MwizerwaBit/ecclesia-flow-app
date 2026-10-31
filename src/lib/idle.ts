/**
 * @file idle.ts
 * @description The rules for automatic sign-out, kept apart from the component
 * that applies them so they can be tested on their own.
 */
import { ROLES } from '@/lib/constants';
import type { AuthSession } from '@/types';

/** localStorage key holding the time (ms) of the last activity in any tab. */
export const ACTIVITY_KEY = 'ecclesia-last-activity';

/** What the server's limit falls back to if an older server omitted it. */
export const DEFAULT_LEADER_IDLE_MINUTES = 15;
export const MEMBER_IDLE_MINUTES = 60;

/** The limit for this session: the server's value, else by role. */
export function idleMinutesFor(session: Pick<AuthSession, 'idleTimeoutMinutes' | 'user'>): number {
  if (session.idleTimeoutMinutes && session.idleTimeoutMinutes > 0) return session.idleTimeoutMinutes;
  return session.user.role === ROLES.MEMBER ? MEMBER_IDLE_MINUTES : DEFAULT_LEADER_IDLE_MINUTES;
}

/** Milliseconds left before sign-out, given the last activity time. */
export function msUntilSignOut(minutes: number, lastActivityAt: number, now: number): number {
  return minutes * 60_000 - (now - lastActivityAt);
}
