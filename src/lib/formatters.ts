/**
 * @file formatters.ts
 * @description Shared formatting utilities for currency, dates, and numbers.
 * All currency/date rendering across the app goes through these — never inline.
 */

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a number as a currency string.
 * @param amount - Numeric value in the smallest currency unit (dollars/cents handled by precision)
 * @param currency - ISO 4217 currency code, defaults to USD
 * @param locale - BCP 47 locale string, defaults to en-US
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a compact currency value (e.g. $12.4K, $1.2M) for stat cards.
 */
export function formatCurrencyCompact(amount: number, currency = 'USD', locale = 'en-US'): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 1 }).format(amount / 1_000_000)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 1 }).format(amount / 1_000)}K`;
  }
  return formatCurrency(amount, currency, locale);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Format a date as "Oct 12, 2024"
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Format as "Oct 12" (no year — for event cards)
 */
export function formatDateShort(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
}

/**
 * Format a time as "9:00 AM"
 */
export function formatTime(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
}

/**
 * Format a date + time as "Oct 12, 2024 at 9:00 AM"
 */
export function formatDateTime(date: Date | string, locale = 'en-US'): string {
  return `${formatDate(date, locale)} at ${formatTime(date, locale)}`;
}

/**
 * Relative time — "2 days ago", "just now", "in 3 hours"
 */
export function formatRelative(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, 'second');
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  return formatDate(date, locale);
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/** Format a plain number with thousands separators: 1234567 → "1,234,567" */
export function formatNumber(n: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** Format a percentage: 0.742 → "74.2%" */
export function formatPercent(ratio: number, decimals = 1, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

// ─── Names ────────────────────────────────────────────────────────────────────

/** Extract initials from a full name: "Aaron Smith" → "AS" */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** Greet based on local time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
