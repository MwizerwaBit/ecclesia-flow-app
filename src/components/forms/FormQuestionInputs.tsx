/**
 * @file FormQuestionInputs.tsx
 * @description The inputs a person fills in for a form's questions. Used by an event's public
 * sign-up page and by a standalone form's public page; answers are keyed by the question's wording.
 */
import type { FormAnswers, FormField } from '@/types';
import { Checkbox, Input, Select, Text } from '@/components/ui';

interface FormQuestionInputsProps {
  fields: FormField[];
  answers: FormAnswers;
  onChange: (answers: FormAnswers) => void;
}

export function FormQuestionInputs({ fields, answers, onChange }: FormQuestionInputsProps) {
  const set = (label: string, value: string | string[]) => onChange({ ...answers, [label]: value });

  return (
    <>
      {fields.map((field) => {
        const label = field.required ? `${field.label} *` : field.label;
        return (
          <div key={field.id}>
            {field.fieldType === 'text' && (
              <Input label={label} value={(answers[field.label] as string) ?? ''} onChange={(e) => set(field.label, e.target.value)} />
            )}
            {field.fieldType === 'single_choice' && (
              <Select
                label={label}
                value={(answers[field.label] as string) ?? ''}
                onChange={(e) => set(field.label, e.target.value)}
                options={[{ value: '', label: 'Choose one' }, ...field.options.map((o) => ({ value: o, label: o }))]}
              />
            )}
            {field.fieldType === 'checkbox' && (
              <div role="group" aria-label={field.label} className="space-y-1.5">
                <Text variant="label" color="muted" className="block">
                  {label}
                </Text>
                {field.options.map((option) => {
                  const selected = (answers[field.label] as string[] | undefined) ?? [];
                  return (
                    <Checkbox
                      key={option}
                      label={option}
                      checked={selected.includes(option)}
                      onChange={(e) => set(field.label, e.target.checked ? [...selected, option] : selected.filter((o) => o !== option))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
