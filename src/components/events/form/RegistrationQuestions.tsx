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
import { ClipboardList, Copy } from 'lucide-react';
import type { RegistrationFieldDraft } from '@/types';
import { eventsService } from '@/services/eventsService';
import { orgService } from '@/services/orgService';
import { shareOrCopy } from '@/lib/download';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, Input, Skeleton, Text } from '@/components/ui';
import { QuestionEditor } from '@/components/forms/QuestionEditor';
import { problemWithFields, toDrafts } from '@/lib/forms';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

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

  // shareOrCopy says what happened; a silent clipboard write left people guessing.
  async function copyLink() {
    const result = await shareOrCopy({ title: title || 'Gathering', url: shareUrl });
    if (result === 'copied') toast.success('Link copied');
    else if (result === 'failed') toast.error('Couldn’t copy the link. Select it and copy it by hand.');
  }

  const incomplete = problemWithFields(fields) !== null;

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
          <QuestionEditor
            fields={fields}
            onChange={(next: RegistrationFieldDraft[]) => setEdits(next)}
            emptyText="No questions yet. People will only tell you they’re coming."
          >
            <Button
              type="button"
              variant="primary"
              isLoading={save.isPending}
              disabled={!dirty || incomplete}
              onClick={() => save.mutate()}
            >
              Save questions
            </Button>
          </QuestionEditor>

          {save.isError && <ErrorNotice error={save.error} />}
        </>
      )}
    </Card>
  );
}
