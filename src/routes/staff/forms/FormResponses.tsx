/**
 * @file FormResponses.tsx
 * @description What people answered on a standalone form. The list and the CSV export are the same
 * ResponsesView an event's responses page uses.
 */
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { formsService } from '@/services/formsService';
import { fileStem } from '@/lib/forms';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { ResponsesView } from '@/components/forms/ResponsesView';
import { Text } from '@/components/ui';

export function FormResponses() {
  const { id = '' } = useParams();
  const zone = useChurchTimeZone();

  const { data: form } = useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsService.get(id),
    enabled: Boolean(id),
  });
  const responses = useQuery({
    queryKey: ['forms', id, 'submissions'],
    queryFn: () => formsService.listSubmissions(id),
    enabled: Boolean(id),
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Link
          to={`/staff/forms/${id}`}
          className="text-body-sm text-slate-500 hover:text-primary transition-colors mb-2 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} aria-hidden /> Back to {form?.title ?? 'the form'}
        </Link>
        <Text variant="h1">Responses</Text>
      </header>

      <ResponsesView
        fields={form?.fields ?? []}
        submissions={responses.data ?? []}
        isLoading={responses.isLoading}
        error={responses.error}
        onRetry={() => void responses.refetch()}
        zone={zone}
        exportCsv={() => formsService.exportSubmissions(id)}
        fileName={`${fileStem(form?.title ?? 'form')}-responses`}
        emptyText="Open the form and share its link: answers will show up here."
      />
    </div>
  );
}
