import { describe, expect, it } from 'vitest';
import { formatCountdown } from './impersonation';

describe('formatCountdown', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatCountdown(12 * 60_000 + 5_000)).toBe('12:05');
    expect(formatCountdown(9_000)).toBe('0:09');
  });

  it('rounds a part-second up so it never shows 0:00 while time remains', () => {
    expect(formatCountdown(400)).toBe('0:01');
  });

  it('never goes negative once the time has run out', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5_000)).toBe('0:00');
  });
});
