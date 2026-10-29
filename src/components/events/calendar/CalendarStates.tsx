/**
 * @file CalendarStates.tsx
 * @description The loading, error and "too many events" states every calendar
 * screen shares, so staff, member and public screens fail and wait the same way.
 *
 * Exports
 *   CalendarLoading   { view: 'month' | 'agenda' }  Skeleton shaped like the real thing
 *   CalendarError     { error, onRetry }            the message (errorMessage) and a Retry button
 *   TruncatedNotice   {}                            shown when the API says more events exist than it returned
 *   CalendarEmptyNote { children }                  a quiet line under a month grid with no events
 */
import { type ReactNode } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';
import { Button, Skeleton, Text } from '@/components/ui';
import type { CalendarView } from './calendarState';

export function CalendarLoading({ view }: { view: CalendarView }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading calendar">
      <span className="sr-only">Loading calendar</span>
      {view === 'month' ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {Array.from({ length: 42 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-none xl:h-32" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {[3, 2, 2].map((rows, group) => (
            <div key={group} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: rows }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="space-y-3 py-4">
      {/* ErrorNotice is role="alert", so the failure is announced. */}
      <ErrorNotice error={error} />
      <Button variant="secondary" leftIcon={RefreshCw} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function TruncatedNotice() {
  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10"
    >
      <Info size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
      <Text variant="body-sm">More events than can be shown: narrow the filters.</Text>
    </div>
  );
}

export function CalendarEmptyNote({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="py-4 text-center">
      <Text variant="body-sm" color="muted">
        {children}
      </Text>
    </div>
  );
}
