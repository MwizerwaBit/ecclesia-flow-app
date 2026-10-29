/**
 * @file RegistrationQuestions.tsx
 * @description The questions people answer when they RSVP on the public share link.
 *
 * They belong to a saved gathering, so this only appears when editing. It saves
 * on its own button, separate from the gathering's details, because the API
 * replaces the whole question list in one call.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Copy, Plus, Trash2 } from 'lucide-react';
import type { RegistrationField, RegistrationFieldDraft, RegistrationFieldType } from '@/types';
import { eventsService } from '@/services/eventsService';
import { orgService } from '@/services/orgService';
import { shareOrCopy } from '@/lib/download';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, Checkbox, Input, Select, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

const FIELD_TYPES: Array<{ value: RegistrationFieldType; label: string }> = [
  { value: 'text', label: 'Short answer' },
  { value: 'single_choice', label: 'Choose one' },
  { value: 'checkbox', label: 'Choose any' },
];

function blankField(): RegistrationFieldDraft {
  return { label: '', fieldType: 'text', options: [], required: false };
}

const toDrafts = (saved: RegistrationField[]): RegistrationFieldDraft[] =>
  saved.map(({ label, fieldType, options, required }) => ({ label, fieldType, options, required }));

interface RegistrationQuestionsProps {
  eventId: string;
  /** For the share sheet's title. */
  title: string;
}

export function RegistrationQuestions({ eventId, title }: RegistrationQuestionsProps) {
  const queryClient = useQueryClient();
  // What has been typed since the last save; null while nothing has been touched.
  const [edits, setEdits] = useState<RegistrationFieldDraft[] | null>(null);

  const saved = useQuery({
    queryKey: ['events', eventId, 'fields'],
    queryFn: () => eventsService.getRegistrationFields(eventId),
    retry: false,
  });

  // Show what is saved, but never over what someone is in the middle of editing.
  const fields = edits ?? toDrafts(saved.data ?? []);
  const dirty = edits !== null;

  const { data: org } = useQuery({ queryKey: ['org', 'profile'], queryFn: () => orgService.getProfile() });
  const shareUrl = org ? `${window.location.origin}/c/${org.slug}/events/${eventId}` : '';

  const save = useMutation({
    mutationFn: () => eventsService.setRegistrationFields(eventId, fields),
    meta: { inline: true },
    onSuccess: (result) => {
      queryClient.setQueryData(['events', eventId, 'fields'], result);
      setEdits(null);
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  function edit(change: (prev: RegistrationFieldDraft[]) => RegistrationFieldDraft[]) {
    setEdits(change(fields));
  }

  const updateField = (index: number, patch: Partial<RegistrationFieldDraft>) =>
    edit((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  function moveField(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    edit((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // shareOrCopy says what happened; a silent clipboard write left people guessing.
  async function copyLink() {
    const result = await shareOrCopy({ title: title || 'Gathering', url: shareUrl });
    if (result === 'copied') toast.success('Link copied');
    else if (result === 'failed') toast.error('Couldn’t copy the link. Select it and copy it by hand.');
  }

  const removeField = (index: number) => edit((prev) => prev.filter((_, i) => i !== index));

  const incomplete = fields.some((f) => !f.label.trim() || (f.fieldType !== 'text' && f.options.length === 0));

  return (
    <Card variant="outline" padding="md" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Text variant="label" color="muted">
          Registration questions
        </Text>
        {fields.length > 0 && (
          <Link
            to={`/staff/events/${eventId}/responses`}
            className="text-body-sm text-primary hover:underline flex items-center gap-1 min-h-11"
          >
            <ClipboardList size={13} aria-hidden /> View responses
          </Link>
        )}
      </div>
      <Text variant="caption" color="muted" className="-mt-2 block">
        Shown on the public share link before anyone RSVPs. Leave empty for a plain "I'll be there".
      </Text>

      {shareUrl && (
        <div className="flex items-end gap-2">
          <Input label="Share link" value={shareUrl} readOnly className="font-mono text-caption" />
          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={Copy}
            aria-label="Copy share link"
            onClick={() => void copyLink()}
          >
            Copy
          </Button>
        </div>
      )}

      {saved.isPending && (
        <div className="space-y-2" role="status" aria-label="Loading questions">
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {saved.isError && (
        <div className="space-y-2">
          <ErrorNotice error={saved.error} />
          <Button type="button" variant="secondary" size="sm" onClick={() => void saved.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {saved.isSuccess && (
        <>
          {fields.length === 0 && (
            <Text variant="body-sm" color="muted">
              No questions yet. People will only tell you they’re coming.
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
                  <Input
                    label="Question"
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    label="Type"
                    value={field.fieldType}
                    onChange={(e) =>
                      updateField(index, {
                        fieldType: e.target.value as RegistrationFieldType,
                        options: e.target.value === 'text' ? [] : field.options,
                      })
                    }
                    options={FIELD_TYPES}
                  />
                </div>

                {field.fieldType !== 'text' && (
                  <Input
                    label="Options (comma-separated)"
                    value={field.options.join(', ')}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Checkbox
                    label="Required"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Move question ${index + 1} up`}
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Move question ${index + 1} down`}
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      leftIcon={Trash2}
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => removeField(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {save.isError && <ErrorNotice error={save.error} />}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              leftIcon={Plus}
              onClick={() => edit((prev) => [...prev, blankField()])}
            >
              Add question
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={save.isPending}
              disabled={!dirty || incomplete}
              onClick={() => save.mutate()}
            >
              Save questions
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
