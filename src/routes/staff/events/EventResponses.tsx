/**
 * @file EventResponses.tsx
 * @description Who answered an event's registration questions, and what
 * they said — the staff-facing half of the public share link.
 *
 * Column order follows the form's current field order; a question that was
 * since removed still shows (its answers were snapshotted at submission
 * time, not dropped), just appended after the live ones.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Inbox, Mail, Phone } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { downloadCsv } from '@/lib/download';
import { Button, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { formatDateTime } from '@/lib/formatters';

export function EventResponses() {
  const { id = '' } = useParams();

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getById(id),
    enabled: Boolean(id),
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['events', id, 'fields'],
    queryFn: () => eventsService.getRegistrationFields(id),
    enabled: Boolean(id),
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['events', id, 'responses'],
    queryFn: () => eventsService.listResponses(id),
    enabled: Boolean(id),
  });

  const columns = useMemo(() => {
    const live = fields.map((f) => f.label);
    const extra = new Set<string>();
    for (const r of responses) {
      for (const label of Object.keys(r.answers)) {
        if (!live.includes(label)) extra.add(label);
      }
    }
    return [...live, ...extra];
  }, [fields, responses]);

  function formatAnswer(value: string | string[] | undefined): string {
    if (value === undefined) return '—';
    return Array.isArray(value) ? value.join(', ') : value;
  }

  function exportCsv() {
    downloadCsv(
      `${event?.title ?? 'event'}-responses`,
      [
        ['Name', (r) => r.respondentName],
        ['Email', (r) => r.respondentEmail],
        ['Phone', (r) => r.respondentPhone],
        ['Submitted', (r) => formatDateTime(r.createdAt)],
        ...columns.map((label): [string, (r: (typeof responses)[number]) => string] => [
          label,
          (r) => formatAnswer(r.answers[label]),
        ]),
      ],
      responses,
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Link
          to={`/staff/events/${id}`}
          className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-2 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} aria-hidden /> Back to {event?.title ?? 'gathering'}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Text variant="h1" className="mb-1">
              Responses
            </Text>
            <Text variant="body" color="muted">
              {responses.length} {responses.length === 1 ? 'person has' : 'people have'} registered.
            </Text>
          </div>
          <Button variant="secondary" leftIcon={Download} onClick={exportCsv} disabled={responses.length === 0}>
            Export CSV
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}

      {!isLoading && responses.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No responses yet"
          description="Share this gathering's public link and answers will show up here."
        />
      )}

      <div className="space-y-3">
        {responses.map((r) => (
          <Card key={r.id} padding="md" variant="outline" className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Text variant="h3">{r.respondentName}</Text>
              <Text variant="caption" color="muted" className="shrink-0">
                {formatDateTime(r.createdAt)}
              </Text>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {r.respondentEmail && (
                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
                  <Mail size={13} aria-hidden /> {r.respondentEmail}
                </Text>
              )}
              {r.respondentPhone && (
                <Text variant="body-sm" color="muted" className="flex items-center gap-1.5">
                  <Phone size={13} aria-hidden /> {r.respondentPhone}
                </Text>
              )}
            </div>
            {columns.length > 0 && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {columns
                  .filter((label) => r.answers[label] !== undefined)
                  .map((label) => (
                    <div key={label}>
                      <dt className="text-caption text-slate-400">{label}</dt>
                      <dd className="text-body-sm text-slate-700 dark:text-slate-300">{formatAnswer(r.answers[label])}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
