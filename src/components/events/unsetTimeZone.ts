/**
 * @file unsetTimeZone.ts
 * @description Whether a church is still on the default time zone (see TimeZoneNotice).
 */
const UTC_NAMES = new Set(['UTC', 'Etc/UTC', 'Etc/GMT', 'GMT']);

/** True when the church is on the default UTC zone and the browser is somewhere else. */
export function isUnsetTimeZone(churchZone: string, browserZone?: string): boolean {
  const browser = browserZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return churchZone === 'UTC' && Boolean(browser) && !UTC_NAMES.has(browser);
}
