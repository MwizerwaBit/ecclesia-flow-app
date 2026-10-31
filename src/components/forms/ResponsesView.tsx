/**
 * @file ResponsesView.tsx
 * @description What people answered: a card per response and an "Export CSV" button. Shared by an
 * event's responses page and a standalone form's, which differ only in where the rows come from.
 *
 * Column order follows the form's current questions; a question that was since removed still
 * shows (its answers were kept with the response), after the live ones.
 */
import { useMemo, useState } from 'react';
import { Download, Inbox, Mail, Phone } from 'lucide-react';
import type { FormField, FormSubmission } from '@/types';
import { formatAnswer, responseColumns } from '@/lib/forms';
import { saveBlob } from '@/lib/download';
import { formatDateTime } from '@/lib/formatters';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

interface ResponsesViewProps {
  fields: FormField[];
  submissions: FormSubmission[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** The church's time zone, so a time reads the same as on the calendar. */
  zone: string;
  /** Builds the CSV on the server; the file is saved under `fileName`. */
  exportCsv: () => Promise<Blob>;
  fileName: string;
  emptyText: string;
}

export function ResponsesView({
  fields,
  submissions,
  isLoading,
  error,
  onRetry,
  zone,
  exportCsv,
  fileName,
  emptyText,
}: ResponsesViewProps) {
  const [exporting, setExporting] = useState(false);
  const columns = useMemo(() => responseColumns(fields, submissions), [fields, submissions]);
  const isError = Boolean(error);

  async function download() {
    setExporting(true);
    try {
      saveBlob(await exportCsv(), `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error('Couldn’t export the responses. Try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Text variant="body" color="muted">
          {isLoading || isError
            ? 'Who has answered.'
            : `${submissions.length} ${submissions.length === 1 ? 'person has' : 'people have'} answered.`}
        </Text>
        <Button
          variant="secondary"
          leftIcon={Download}
          onClick={() => void download()}
          isLoading={exporting}
          disabled={submissions.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading responses">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        )}
        {isError && (
          <div className="space-y-3">
            <ErrorNotice error={error} />
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {!isLoading && !isError && submissions.length === 0 && (
        <EmptyState icon={Inbox} title="No responses yet" description={emptyText} />
      )}

      <div className="space-y-3">
        {submissions.map((r) => (
          <Card key={r.id} padding="md" variant="outline" className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              {/* People type these on a public page: a long unbroken name or answer must wrap, not run off the card. */}
              <Text variant="h3" className="min-w-0 break-words">
                {r.respondentName}
              </Text>
              <Text variant="caption" color="muted" className="shrink-0">
                {formatDateTime(r.createdAt, 'en-US', zone)}
              </Text>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {r.respondentEmail && (
                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5 min-w-0 break-all">
                  <Mail size={13} aria-hidden className="shrink-0" /> {r.respondentEmail}
                </Text>
              )}
              {r.respondentPhone && (
                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
                  <Phone size={13} aria-hidden /> {r.respondentPhone}
                </Text>
              )}
            </div>
            {columns.length > 0 && (
              <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {columns
                  .filter((label) => r.answers[label] !== undefined)
                  .map((label) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-caption text-slate-400 break-words">{label}</dt>
                      <dd className="text-body-sm text-slate-700 dark:text-slate-300 break-words">{formatAnswer(r.answers[label])}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
