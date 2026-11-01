/**
 * @file EventResponses.tsx
 * @description Who answered an event's registration questions, and what
 * they said — the staff-facing half of the public share link. The list and the
 * CSV export are the forms module's (ResponsesView); this page adds the event
 * around them and the switch that stops the link taking sign-ups.
 */
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { fileStem } from '@/lib/forms';
import { ResponsesView } from '@/components/forms/ResponsesView';
import { Badge, Button, Text } from '@/components/ui';
import { useChurchTimeZone } from '@/hooks/useChurchTimeZone';
import { toast } from '@/hooks/useToastStore';

export function EventResponses() {
  const { id = '' } = useParams();
  const zone = useChurchTimeZone();
  const queryClient = useQueryClient();

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

  const responses = useQuery({
    queryKey: ['events', id, 'responses'],
    queryFn: () => eventsService.listResponses(id),
    enabled: Boolean(id),
  });

  const status = useQuery({
    queryKey: ['events', id, 'registration'],
    queryFn: () => eventsService.getRegistrationStatus(id),
    enabled: Boolean(id),
  });
  const open = status.data !== 'closed';

  const toggle = useMutation({
    mutationFn: () => eventsService.setRegistrationStatus(id, open ? 'closed' : 'published'),
    onSuccess: (next) => {
      queryClient.setQueryData(['events', id, 'registration'], next);
      toast.success(next === 'closed' ? 'Sign-ups closed' : 'Sign-ups open again');
    },
  });

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
          <div className="flex items-center gap-2">
            <Text variant="h1" className="mb-1">
              Responses
            </Text>
            {status.isSuccess && (
              <Badge variant={open ? 'success' : 'neutral'} size="sm">
                {open ? 'Taking sign-ups' : 'Sign-ups closed'}
              </Badge>
            )}
          </div>
          {status.isSuccess && (
            <Button variant="secondary" isLoading={toggle.isPending} onClick={() => toggle.mutate()}>
              {open ? 'Close sign-ups' : 'Reopen sign-ups'}
            </Button>
          )}
        </div>
      </header>

      <ResponsesView
        fields={fields}
        submissions={responses.data ?? []}
        isLoading={responses.isLoading}
        error={responses.error}
        onRetry={() => void responses.refetch()}
        zone={zone}
        exportCsv={() => eventsService.exportResponses(id)}
        fileName={`${fileStem(event?.title ?? 'event')}-responses`}
        emptyText="Share this gathering's public link and answers will show up here."
      />
    </div>
  );
}
