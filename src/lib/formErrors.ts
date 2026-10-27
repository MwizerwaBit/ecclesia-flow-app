/**
 * @file formErrors.ts
 * @description Turns a failed API call into something a person can act on.
 *
 * The API answers a rejected payload with a generic message and the useful
 * detail in `fields` (one entry per rejected field). Screens that only show
 * `error.message` therefore say "The request payload is invalid" and nothing
 * more. These helpers read `fields` so the message names what to fix, and so a
 * form can put each message under its own input.
 */
import { ApiError } from '@/services/adapter';

interface FieldIssue {
  loc?: unknown[];
  msg?: string;
}

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** "church_name" / "churchName" → "Church name". */
function humanise(field: string): string {
  const spaced = field.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Pydantic prefixes custom validator messages; people don't need to see that. */
function clean(msg: string): string {
  const text = msg.replace(/^Value error,\s*/i, '').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function issues(error: unknown): FieldIssue[] {
  return error instanceof ApiError && Array.isArray(error.fields) ? (error.fields as FieldIssue[]) : [];
}

/** The rejected fields, keyed by the camelCase name the form uses. First message per field wins. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues(error)) {
    const name = [...(issue.loc ?? [])].reverse().find((part) => typeof part === 'string' && part !== 'body');
    if (typeof name !== 'string' || !issue.msg) continue;
    const key = toCamel(name);
    out[key] ??= clean(issue.msg);
  }
  return out;
}

/** One readable sentence for a toast or banner. */
export function describeError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'network_error') return 'Can’t reach the server. Check your connection and try again.';
    const fields = Object.entries(apiFieldErrors(error));
    if (error.status === 422 && fields.length > 0) {
      const shown = fields.slice(0, 2).map(([key, msg]) => `${humanise(key)}: ${msg}`);
      const more = fields.length > 2 ? ` (and ${fields.length - 2} more)` : '';
      return `${shown.join('. ')}${more}`;
    }
    if (error.status === 403) return error.message || 'You don’t have permission to do that.';
    if (error.status === 429) return error.message || 'Too many attempts. Wait a moment and try again.';
    if (error.status >= 500) return 'The server hit a problem. Please try again in a moment.';
    return error.message || fallback;
  }
  if (error instanceof TypeError) return 'Can’t reach the server. Check your connection and try again.';
  return error instanceof Error && error.message ? error.message : fallback;
}
