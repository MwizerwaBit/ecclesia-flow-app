/**
 * @file QuestionEditor.tsx
 * @description The list of questions on a form: wording, type, options, required, order.
 * Shared by an event's registration questions and by the forms screen. It edits a draft the
 * caller owns; saving is the caller's, so each place keeps its own save button (passed as
 * children, beside "Add question").
 */
import { useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormFieldDraft, FormFieldType } from '@/types';
import { FIELD_TYPES, blankField, parseOptions, problemWithFields } from '@/lib/forms';
import { Button, Checkbox, Input, Select, Text } from '@/components/ui';

interface QuestionEditorProps {
  fields: FormFieldDraft[];
  onChange: (fields: FormFieldDraft[]) => void;
  /** Shown beside "Add question": the caller's save button. */
  children?: ReactNode;
  /** What to say when there are no questions yet. */
  emptyText?: string;
}

/**
 * Options are typed as one comma-separated line. The text is kept here as typed: turning it into a
 * list and back on every keystroke would delete the comma you have just typed. When the list
 * changes from outside (a question moved or removed, a reload) the line is rewritten to match.
 */
function OptionsInput({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const [text, setText] = useState(options.join(', '));
  if (parseOptions(text).join('\n') !== options.join('\n')) setText(options.join(', '));
  return (
    <Input
      label="Options (comma-separated)"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseOptions(e.target.value));
      }}
    />
  );
}

export function QuestionEditor({ fields, onChange, children, emptyText }: QuestionEditorProps) {
  const update = (index: number, patch: Partial<FormFieldDraft>) =>
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const problem = problemWithFields(fields);

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <Text variant="body-sm" color="muted">
          {emptyText ?? 'No questions yet.'}
        </Text>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={index}
            role="group"
            aria-label={`Question ${index + 1}`}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
              {/* Input and Select both fill their parent (w-full), so on a wide row the Select gets a fixed column and this takes the rest. */}
              <div className="flex-1 min-w-0">
                <Input label="Question" value={field.label} onChange={(e) => update(index, { label: e.target.value })} />
              </div>
              <Select
                label="Type"
                value={field.fieldType}
                onChange={(e) =>
                  update(index, {
                    fieldType: e.target.value as FormFieldType,
                    options: e.target.value === 'text' ? [] : field.options,
                  })
                }
                options={FIELD_TYPES}
                className="lg:w-48 lg:shrink-0"
              />
            </div>

            {field.fieldType !== 'text' && (
              <OptionsInput options={field.options} onChange={(options) => update(index, { options })} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Checkbox
                label="Required"
                checked={field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Move question ${index + 1} up`}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Move question ${index + 1} down`}
                  onClick={() => move(index, 1)}
                  disabled={index === fields.length - 1}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  leftIcon={Trash2}
                  aria-label={`Remove question ${index + 1}`}
                  onClick={() => onChange(fields.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {problem && fields.length > 0 && (
        <Text variant="body-sm" color="muted" role="status">
          {problem}
        </Text>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" leftIcon={Plus} onClick={() => onChange([...fields, blankField()])}>
          Add question
        </Button>
        {children}
      </div>
    </div>
  );
}
