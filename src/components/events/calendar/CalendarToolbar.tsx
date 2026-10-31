/**
 * @file CalendarToolbar.tsx
 * @description The calendar's controls: previous / next / Today, the month title,
 * a Month | Agenda switch and a slot for filters.
 *
 * Props contract
 *   title         string                 "March 2026" (from useCalendarWindow). It is a
 *                                        live region, so a screen reader hears the month change.
 *   onPrev/onNext () => void             step one month
 *   onToday       () => void             back to the current month
 *   view          'month' | 'agenda'
 *   onViewChange  (view) => void
 *   busy          boolean                shows a small non-blocking spinner while a window loads
 *   filters       ReactNode              slot under the controls, normally <CalendarFilterBar />
 *   actions       ReactNode              optional slot beside the view switch
 *
 * Month navigation by keyboard also works inside the month grid (PageUp / PageDown).
 */
import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button, SegmentedControl, Text } from '@/components/ui';
import type { CalendarView } from './calendarState';

interface CalendarToolbarProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  busy?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function CalendarToolbar({
  title,
  onPrev,
  onNext,
  onToday,
  view,
  onViewChange,
  busy = false,
  filters,
  actions,
}: CalendarToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" aria-label="Previous month" leftIcon={ChevronLeft} onClick={onPrev} className="w-11 px-0" />
          <Button variant="ghost" aria-label="Next month" leftIcon={ChevronRight} onClick={onNext} className="w-11 px-0" />
          <Button variant="secondary" onClick={onToday}>
            Today
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Text as="h2" variant="h2" aria-live="polite" className="truncate">
            {title}
          </Text>
          {busy && (
            <span role="status" className="shrink-0 text-slate-400">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              <span className="sr-only">Updating calendar</span>
            </span>
          )}
        </div>

        <div className="flex w-full items-center gap-2 xl:w-auto">
          <SegmentedControl<CalendarView>
            label="Calendar view"
            value={view}
            onChange={onViewChange}
            // 52px outer with the control's p-1 leaves 44px tabs, the touch-target minimum
            className="h-[3.25rem] xl:w-56"
            options={[
              { value: 'month', label: 'Month' },
              { value: 'agenda', label: 'Agenda' },
            ]}
          />
          {actions}
        </div>
      </div>

      {filters}
    </div>
  );
}
