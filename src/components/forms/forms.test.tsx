// @vitest-environment jsdom
/**
 * The pieces every form screen shares: the question editor, the answer inputs and the responses
 * list with its export. Each test says what a person would see and be able to do.
 */
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormAnswers, FormField, FormFieldDraft, FormSubmission } from '@/types';

const h = vi.hoisted(() => ({ saveBlob: vi.fn(), toastError: vi.fn() }));
vi.mock('@/lib/download', () => ({ saveBlob: h.saveBlob, shareOrCopy: vi.fn() }));
vi.mock('@/hooks/useToastStore', () => ({ toast: { error: h.toastError, success: vi.fn() } }));

import { FormQuestionInputs } from './FormQuestionInputs';
import { QuestionEditor } from './QuestionEditor';
import { ResponsesView } from './ResponsesView';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Editor({ initial = [] as FormFieldDraft[], onChange }: { initial?: FormFieldDraft[]; onChange?: (f: FormFieldDraft[]) => void }) {
  const [fields, setFields] = useState(initial);
  return (
    <QuestionEditor
      fields={fields}
      onChange={(next) => {
        setFields(next);
        onChange?.(next);
      }}
    >
      <button type="button">Save</button>
    </QuestionEditor>
  );
}

describe('QuestionEditor', () => {
  it('adds a question and keeps what is typed', async () => {
    const user = userEvent.setup();
    const seen: FormFieldDraft[][] = [];
    render(<Editor onChange={(f) => seen.push(f)} />);
    expect(screen.getByText('No questions yet.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add question' }));
    await user.type(screen.getByLabelText('Question'), 'Favourite hymn');
    expect(seen.at(-1)).toEqual([{ label: 'Favourite hymn', fieldType: 'text', options: [], required: false }]);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('lets a person type the commas between options', async () => {
    const user = userEvent.setup();
    const seen: FormFieldDraft[][] = [];
    render(<Editor initial={[{ label: 'Size', fieldType: 'single_choice', options: [], required: false }]} onChange={(f) => seen.push(f)} />);
    const options = screen.getByLabelText('Options (comma-separated)');
    await user.type(options, 'S, M, L');
    expect(options).toHaveValue('S, M, L');
    expect(seen.at(-1)?.[0].options).toEqual(['S', 'M', 'L']);
  });

  it('hides the options for a short answer and says what is still wrong', async () => {
    const user = userEvent.setup();
    render(<Editor initial={[{ label: 'Size', fieldType: 'single_choice', options: [], required: false }]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/at least one option/i);
    await user.selectOptions(screen.getByLabelText('Type'), 'text');
    expect(screen.queryByLabelText('Options (comma-separated)')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('moves and removes questions, and each question keeps its own options', async () => {
    const user = userEvent.setup();
    const seen: FormFieldDraft[][] = [];
    render(
      <Editor
        initial={[
          { label: 'First', fieldType: 'single_choice', options: ['a', 'b'], required: false },
          { label: 'Second', fieldType: 'checkbox', options: ['x'], required: true },
        ]}
        onChange={(f) => seen.push(f)}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Move question 2 up' }));
    expect(seen.at(-1)?.map((f) => f.label)).toEqual(['Second', 'First']);
    const first = screen.getByRole('group', { name: 'Question 1' });
    expect(within(first).getByLabelText('Options (comma-separated)')).toHaveValue('x');

    await user.click(screen.getByRole('button', { name: 'Remove question 1' }));
    expect(seen.at(-1)?.map((f) => f.label)).toEqual(['First']);
    expect(screen.getByLabelText('Options (comma-separated)')).toHaveValue('a, b');
    expect(screen.getByRole('button', { name: 'Move question 1 up' })).toBeDisabled();
  });
});

const FIELDS: FormField[] = [
  { id: '1', label: 'Name of guest', fieldType: 'text', options: [], required: true, position: 0 },
  { id: '2', label: 'Size', fieldType: 'single_choice', options: ['S', 'M'], required: false, position: 1 },
  { id: '3', label: 'Allergies', fieldType: 'checkbox', options: ['Nuts', 'Dairy'], required: false, position: 2 },
];

describe('FormQuestionInputs', () => {
  function Host({ onAnswers }: { onAnswers: (a: FormAnswers) => void }) {
    const [answers, setAnswers] = useState<FormAnswers>({});
    return (
      <FormQuestionInputs
        fields={FIELDS}
        answers={answers}
        onChange={(a) => {
          setAnswers(a);
          onAnswers(a);
        }}
      />
    );
  }

  it('collects answers keyed by the question’s wording', async () => {
    const user = userEvent.setup();
    const seen: FormAnswers[] = [];
    render(<Host onAnswers={(a) => seen.push(a)} />);
    expect(screen.getByLabelText('Name of guest *')).toBeInTheDocument(); // required is marked
    await user.type(screen.getByLabelText('Name of guest *'), 'Ruth');
    await user.selectOptions(screen.getByLabelText('Size'), 'M');
    const allergies = screen.getByRole('group', { name: 'Allergies' });
    await user.click(within(allergies).getByLabelText('Nuts'));
    await user.click(within(allergies).getByLabelText('Dairy'));
    await user.click(within(allergies).getByLabelText('Nuts')); // and take one back
    expect(seen.at(-1)).toEqual({ 'Name of guest': 'Ruth', Size: 'M', Allergies: ['Dairy'] });
  });
});

const sub = (id: string, name: string, answers: FormSubmission['answers']): FormSubmission => ({
  id,
  respondentName: name,
  respondentEmail: `${name.toLowerCase()}@example.com`,
  respondentPhone: null,
  answers,
  createdAt: '2026-10-31T09:30:00Z',
});

function responses(over: Partial<React.ComponentProps<typeof ResponsesView>> = {}) {
  return (
    <ResponsesView
      fields={FIELDS}
      submissions={[]}
      isLoading={false}
      error={null}
      onRetry={() => {}}
      zone="UTC"
      exportCsv={() => Promise.resolve(new Blob(['x']))}
      fileName="visitor-card-responses"
      emptyText="Nothing yet."
      {...over}
    />
  );
}

describe('ResponsesView', () => {
  it('says there are no responses, and offers no export', () => {
    render(responses());
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
  });

  it('shows each response with its answers, including a question since removed', () => {
    render(
      responses({
        submissions: [sub('a', 'Ann', { Size: 'M', Allergies: ['Nuts', 'Dairy'], 'Old question': 'kept' }), sub('b', 'Ben', {})],
      }),
    );
    expect(screen.getByText('2 people have answered.')).toBeInTheDocument();
    expect(screen.getByText('Nuts, Dairy')).toBeInTheDocument();
    expect(screen.getByText('Old question')).toBeInTheDocument();
    expect(screen.getByText('kept')).toBeInTheDocument();
    expect(screen.getByText('ann@example.com')).toBeInTheDocument();
  });

  it('saves the file the server builds, named for the form and the day', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['csv']);
    const exportCsv = vi.fn().mockResolvedValue(blob);
    render(responses({ submissions: [sub('a', 'Ann', {})], exportCsv }));
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(h.saveBlob).toHaveBeenCalled());
    expect(h.saveBlob).toHaveBeenCalledWith(blob, expect.stringMatching(/^visitor-card-responses-\d{4}-\d{2}-\d{2}\.csv$/));
  });

  it('tells the person when the export fails, and can be tried again', async () => {
    const user = userEvent.setup();
    const exportCsv = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(new Blob(['x']));
    render(responses({ submissions: [sub('a', 'Ann', {})], exportCsv }));
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(h.toastError).toHaveBeenCalled());
    expect(h.saveBlob).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    await waitFor(() => expect(h.saveBlob).toHaveBeenCalledTimes(1));
  });

  it('offers a retry when the list could not be loaded', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(responses({ error: new Error('offline'), onRetry }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByText('No responses yet')).not.toBeInTheDocument();
  });
});
