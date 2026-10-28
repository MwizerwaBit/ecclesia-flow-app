/**
 * @file validation.ts
 * @description Field rules and a small hook that shows their messages at the
 * right moment.
 *
 * When a message appears:
 *  - after a person leaves a field (blur), not while they are still typing it;
 *  - live afterwards, so the message clears the moment the value is fixed;
 *  - for every field on submit, so nothing is left to a silently disabled button;
 *  - from the server, under the field it named, when the API still rejects a value.
 *
 * The rules mirror the API's. The API stays the authority; these exist so a
 * mistake is explained before the round trip, not after it.
 */
import { useCallback, useMemo, useState } from 'react';

export type Rule = (value: string) => string | null;

export const required =
  (label: string): Rule =>
  (v) => (v.trim() ? null : `${label} is required`);

export const minLength =
  (label: string, n: number): Rule =>
  (v) => (v.trim().length >= n ? null : `${label} needs at least ${n} characters`);

export const email: Rule = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a valid email address, like name@church.org');

/** Same rule as the API: 10+ characters, upper and lower case, a digit. Say which part is missing. */
export const password: Rule = (v) => {
  if (v.length < 10) return `Use at least 10 characters (${v.length} so far)`;
  if (v === v.toLowerCase() || v === v.toUpperCase()) return 'Mix upper and lower case letters';
  if (!/\d/.test(v)) return 'Include at least one number';
  return null;
};

export const matches =
  (other: string, label: string): Rule =>
  (v) => (v === other ? null : `Doesn’t match ${label}`);

/** The first rule that complains wins. */
export const all =
  (...rules: Rule[]): Rule =>
  (v) => {
    for (const rule of rules) {
      const message = rule(v);
      if (message) return message;
    }
    return null;
  };

export function useFieldErrors<K extends string>(
  values: Record<K, string>,
  rules: Partial<Record<K, Rule>>,
  /** Messages the server gave for these fields, shown until the person edits them. */
  serverErrors: Partial<Record<string, string>> = {},
) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [edited, setEdited] = useState<Partial<Record<string, boolean>>>({});

  const computed = useMemo(() => {
    const out: Partial<Record<K, string>> = {};
    for (const key of Object.keys(rules) as K[]) {
      const message = rules[key]?.(values[key] ?? '');
      if (message) out[key] = message;
    }
    return out;
  }, [values, rules]);

  /** What to show under a field right now. */
  const errorFor = useCallback(
    (key: K): string | undefined => {
      if (touched[key] && computed[key]) return computed[key];
      if (!edited[key] && serverErrors[key]) return serverErrors[key];
      return undefined;
    },
    [touched, computed, edited, serverErrors],
  );

  /** Props for an <Input>: the message, plus blur handling that reveals it. */
  const field = useCallback(
    (key: K) => ({
      error: errorFor(key),
      onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
      onInput: () => setEdited((e) => ({ ...e, [key]: true })),
    }),
    [errorFor],
  );

  /** Reveal every message. Returns true when the form is fine to send. */
  const validateAll = useCallback(() => {
    setTouched(Object.fromEntries((Object.keys(rules) as K[]).map((k) => [k, true])) as Partial<Record<K, boolean>>);
    setEdited({});
    return Object.keys(computed).length === 0;
  }, [rules, computed]);

  return { field, errorFor, validateAll, isValid: Object.keys(computed).length === 0 };
}
