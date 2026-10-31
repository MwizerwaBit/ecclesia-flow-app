/**
 * @file EventHistory.tsx
 * @description Who created, changed, submitted, approved, published or canceled a
 * gathering, newest first, on the church's clock.
 *
 * Collapsed on a phone, where the attendance and the next step matter more and
 * the trail is long; open from tablet width. It only asks the API once opened.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, History } from 'lucide-react';
import { eventsService } from '@/services/eventsService';
import { Button, Skeleton, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { cn } from '@/lib/cn';
import { formatHistoryEntry, newestFirst } from './history';

/** lg is the tablet breakpoint in this app (768px). */
function startsOpen(): boolean {
  try {
    return window.matchMedia('(min-width: 768px)').matches;
  } catch {
    return false;
  }
}

export function EventHistory({ eventId, zone }: { eventId: string; zone: string }) {
  const [open, setOpen] = useState(startsOpen);

  const history = useQuery({
    queryKey: ['event', eventId, 'history'],
    queryFn: () => eventsService.history(eventId),
    enabled: open,
  });

  const lines = newestFirst(history.data ?? []).map((entry) => formatHistoryEntry(entry, zone));

  return (
    <section aria-labelledby="event-history-title" className="space-y-3">
      <h2 id="event-history-title" className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="event-history-body"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Text variant="h2" as="span" className="flex items-center gap-2">
            <History size={20} className="text-slate-400" aria-hidden />
            History
          </Text>
          <ChevronDown size={18} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>

      <div id="event-history-body" hidden={!open} aria-live="polite" aria-busy={history.isLoading}>
        {history.isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading history">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {history.isError && (
          <div className="space-y-3">
            <ErrorNotice error={history.error} />
            <Button variant="secondary" size="sm" onClick={() => void history.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {history.isSuccess && lines.length === 0 && (
          <Text variant="body" color="muted">
            Nothing has been recorded for this gathering yet.
          </Text>
        )}

        {lines.length > 0 && (
          <ol className="space-y-3 border-l border-slate-200 dark:border-slate-700 pl-4 ml-2">
            {lines.map((line) => (
              <li key={line.id} className="relative">
                <span
                  className="absolute -left-[21px] top-2 size-2 rounded-full bg-slate-300 dark:bg-slate-600"
                  aria-hidden
                />
                <Text variant="body">
                  <span className="font-medium">{line.who}</span> · {line.what}
                </Text>
                {line.details.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5">
                    {line.details.map((detail) => (
                      <li key={detail}>
                        <Text variant="body-sm" color="muted">
                          {detail}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
                {line.comment && (
                  <Text variant="body-sm" className="mt-1 whitespace-pre-line italic">
                    “{line.comment}”
                  </Text>
                )}
                <Text variant="caption" color="muted" className="mt-0.5 block">
                  {line.when}
                </Text>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
