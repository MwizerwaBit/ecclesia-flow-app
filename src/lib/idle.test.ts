import { describe, expect, it } from 'vitest';
import { idleMinutesFor, msUntilSignOut } from './idle';
import type { User } from '@/types';

const user = (role: User['role']) => ({ role }) as User;

describe('idleMinutesFor', () => {
  it('uses the server value when it sends one', () => {
    expect(idleMinutesFor({ idleTimeoutMinutes: 30, user: user('staff') })).toBe(30);
    expect(idleMinutesFor({ idleTimeoutMinutes: 60, user: user('member') })).toBe(60);
  });
  it('falls back to 15 minutes for leaders and an hour for members', () => {
    expect(idleMinutesFor({ user: user('staff') })).toBe(15);
    expect(idleMinutesFor({ user: user('board') })).toBe(15);
    expect(idleMinutesFor({ user: user('platform_admin') })).toBe(15);
    expect(idleMinutesFor({ user: user('member') })).toBe(60);
  });
  it('ignores a nonsense server value', () => {
    expect(idleMinutesFor({ idleTimeoutMinutes: 0, user: user('member') })).toBe(60);
  });
});

describe('msUntilSignOut', () => {
  it('counts down from the last activity and goes negative once past the limit', () => {
    const t0 = 1_000_000;
    expect(msUntilSignOut(15, t0, t0)).toBe(15 * 60_000);
    expect(msUntilSignOut(15, t0, t0 + 14 * 60_000)).toBe(60_000);
    expect(msUntilSignOut(15, t0, t0 + 15 * 60_000)).toBe(0);
    expect(msUntilSignOut(15, t0, t0 + 20 * 60_000)).toBeLessThan(0);
  });
});
