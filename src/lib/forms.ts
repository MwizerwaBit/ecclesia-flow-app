/**
 * @file forms.ts
 * @description Rules shared by every screen that builds or fills in a form: an event's
 * registration form, a standalone form, and the public pages for both.
 */
import type { FormAnswers, FormField, FormFieldDraft, FormFieldType, FormStatus, FormSubmission } from '@/types';

export const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'text', label: 'Short answer' },
  { value: 'single_choice', label: 'Choose one' },
  { value: 'checkbox', label: 'Choose any' },
];

export const blankField = (): FormFieldDraft => ({ label: '', fieldType: 'text', options: [], required: false });

export const toDrafts = (saved: FormField[]): FormFieldDraft[] =>
  saved.map(({ label, fieldType, options, required }) => ({ label, fieldType, options, required }));

/** The comma-separated text a person types for a question's options. */
export const parseOptions = (text: string): string[] =>
  text
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Why a set of questions can't be saved yet, or null. The API checks the same things; this
 * says it before the request, next to the question.
 */
export function problemWithFields(fields: FormFieldDraft[]): string | null {
  if (fields.some((f) => !f.label.trim())) return 'Every question needs its wording.';
  if (fields.some((f) => f.fieldType !== 'text' && f.options.length === 0)) return 'Choice questions need at least one option.';
  const seen = new Set<string>();
  for (const f of fields) {
    const key = f.label.trim().toLowerCase();
    if (seen.has(key)) return 'Two questions have the same wording.';
    seen.add(key);
  }
  return null;
}

const isBlank = (value: string | string[] | undefined): boolean =>
  value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim().length === 0);

/** The required questions still unanswered. */
export const missingRequired = (fields: FormField[], answers: FormAnswers): FormField[] =>
  fields.filter((f) => f.required && isBlank(answers[f.label]));

/** What to send: only questions that were answered, text trimmed. */
export function cleanAnswers(fields: FormField[], answers: FormAnswers): FormAnswers {
  const out: FormAnswers = {};
  for (const f of fields) {
    const value = answers[f.label];
    if (isBlank(value)) continue;
    out[f.label] = Array.isArray(value) ? value : (value as string).trim();
  }
  return out;
}

export const formatAnswer = (value: string | string[] | undefined): string =>
  value === undefined ? '—' : Array.isArray(value) ? value.join(', ') : value;

/**
 * Columns for a table of responses: the form's current questions in their order, then any
 * question since removed (its answers were kept, so it still shows).
 */
export function responseColumns(fields: FormField[], submissions: FormSubmission[]): string[] {
  const live = fields.map((f) => f.label);
  const extra = new Set<string>();
  for (const s of submissions) {
    for (const label of Object.keys(s.answers)) if (!live.includes(label)) extra.add(label);
  }
  return [...live, ...extra];
}

export const STATUS_LABEL: Record<FormStatus, string> = { draft: 'Draft', published: 'Open', closed: 'Closed' };

export const formShareUrl = (origin: string, slug: string, publicKey: string): string =>
  `${origin}/c/${encodeURIComponent(slug)}/forms/${encodeURIComponent(publicKey)}`;

/** A file name for a download: the title, lower-cased, safe in any file system. */
export const fileStem = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'form';
