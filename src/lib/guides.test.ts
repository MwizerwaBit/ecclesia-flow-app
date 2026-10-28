import { describe, expect, it } from 'vitest';
import { guideFor } from './guides';
import { hasSeenGuide, markGuideSeen } from '@/hooks/useGuideStore';

describe('page guides', () => {
  it('finds a dashboard guide, with or without a trailing slash', () => {
    expect(guideFor('/staff/dashboard')?.id).toBe('staff-dashboard');
    expect(guideFor('/staff/dashboard/')?.id).toBe('staff-dashboard');
    expect(guideFor('/portal')?.id).toBe('portal-home');
  });

  it('has no guide for an unlisted page', () => {
    expect(guideFor('/staff/settings')).toBeUndefined();
  });

  it('keeps every guide to three steps or fewer', () => {
    for (const path of ['/staff/dashboard', '/board/dashboard', '/platform/dashboard', '/portal', '/staff/members']) {
      const steps = guideFor(path)?.steps.length ?? 0;
      expect(steps).toBeGreaterThan(0);
      expect(steps).toBeLessThanOrEqual(3);
    }
  });

  it('remembers a seen guide per person even when storage is unavailable', () => {
    expect(hasSeenGuide('u1', 'staff-dashboard')).toBe(false);
    markGuideSeen('u1', 'staff-dashboard');
    expect(hasSeenGuide('u1', 'staff-dashboard')).toBe(true);
    expect(hasSeenGuide('u2', 'staff-dashboard')).toBe(false);
  });
});
