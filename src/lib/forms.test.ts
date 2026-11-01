import { describe, expect, it } from 'vitest';
import type { FormField, FormSubmission } from '@/types';
import {
  cleanAnswers,
  fileStem,
  formShareUrl,
  formatAnswer,
  missingRequired,
  parseOptions,
  problemWithFields,
  responseColumns,
  toDrafts,
} from './forms';

const field = (over: Partial<FormField>): FormField => ({
  id: over.label ?? 'f',
  label: 'Q',
  fieldType: 'text',
  options: [],
  required: false,
  position: 0,
  ...over,
});

const FIELDS: FormField[] = [
  field({ label: 'T-shirt size', fieldType: 'single_choice', options: ['S', 'M'], required: true }),
  field({ label: 'Notes', fieldType: 'text' }),
  field({ label: 'Allergies', fieldType: 'checkbox', options: ['Nuts', 'Dairy'] }),
];

describe('problemWithFields', () => {
  it('accepts a sound set, and no questions at all', () => {
    expect(problemWithFields(toDrafts(FIELDS))).toBeNull();
    expect(problemWithFields([])).toBeNull();
  });

  it('says what to fix', () => {
    const base = { fieldType: 'text' as const, options: [], required: false };
    expect(problemWithFields([{ ...base, label: '  ' }])).toMatch(/wording/);
    expect(problemWithFields([{ ...base, label: 'Pick', fieldType: 'checkbox' }])).toMatch(/option/);
    expect(problemWithFields([{ ...base, label: 'Name' }, { ...base, label: ' name ' }])).toMatch(/same wording/);
  });
});

describe('answers', () => {
  it('lists the required questions still unanswered', () => {
    expect(missingRequired(FIELDS, {}).map((f) => f.label)).toEqual(['T-shirt size']);
    expect(missingRequired(FIELDS, { 'T-shirt size': '  ' }).map((f) => f.label)).toEqual(['T-shirt size']);
    expect(missingRequired(FIELDS, { 'T-shirt size': 'M' })).toEqual([]);
    const required = [field({ label: 'Pick any', fieldType: 'checkbox', options: ['a'], required: true })];
    expect(missingRequired(required, { 'Pick any': [] })).toHaveLength(1);
  });

  it('sends only what was answered, trimmed, and only the form’s own questions', () => {
    expect(
      cleanAnswers(FIELDS, { 'T-shirt size': 'M', Notes: '  hi  ', Allergies: [], Stale: 'x' }),
    ).toEqual({ 'T-shirt size': 'M', Notes: 'hi' });
  });

  it('shows a missing answer as a dash and a list as one line', () => {
    expect(formatAnswer(undefined)).toBe('—');
    expect(formatAnswer(['Nuts', 'Dairy'])).toBe('Nuts, Dairy');
    expect(formatAnswer('M')).toBe('M');
  });
});

describe('response columns', () => {
  const sub = (answers: FormSubmission['answers']): FormSubmission => ({
    id: Math.random().toString(),
    respondentName: 'A',
    respondentEmail: null,
    respondentPhone: null,
    answers,
    createdAt: '2026-10-31T09:00:00Z',
  });

  it('puts the current questions first, in order, then a removed question that still has answers', () => {
    expect(responseColumns(FIELDS, [sub({ Removed: 'x', Notes: 'n' }), sub({ 'Old one': 'y' })])).toEqual([
      'T-shirt size',
      'Notes',
      'Allergies',
      'Removed',
      'Old one',
    ]);
  });
});

describe('small helpers', () => {
  it('reads a comma-separated line of options', () => {
    expect(parseOptions('S, M ,, L,')).toEqual(['S', 'M', 'L']);
    expect(parseOptions('')).toEqual([]);
  });

  it('builds the share link from the church and the unguessable key', () => {
    expect(formShareUrl('https://app.example', 'grace-church', 'a1B2_c-3')).toBe(
      'https://app.example/c/grace-church/forms/a1B2_c-3',
    );
  });

  it('makes a safe file name from a title', () => {
    expect(fileStem('Camp: Sign-up!')).toBe('camp-sign-up');
    expect(fileStem('???')).toBe('form');
  });
});
