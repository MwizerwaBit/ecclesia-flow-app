/**
 * @file impersonation.ts
 * @description Small helpers for the impersonation banner.
 */

/** "12:05", or "0:09" in the last seconds. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
