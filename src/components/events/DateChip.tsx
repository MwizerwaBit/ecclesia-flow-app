/**
 * @file DateChip.tsx
 * @description The month-over-day tile that leads an event row.
 *
 * The day is the church's day: a 9:00 service in Kigali sits on its Sunday
 * whatever zone the viewer's browser is in, so the chip is told the zone rather
 * than reading the browser's.
 *
 * @example
 * <DateChip instant={event.startDateTime} zone={zone} />
 */
import { dayKeyInZone, formatDay, parseDayKey } from '@/lib/calendar';
import { cn } from '@/lib/cn';

interface DateChipProps {
  /** An instant (ISO string or Date). */
  instant: string | Date;
  /** The church's IANA time zone. */
  zone: string;
  className?: string;
}

export function DateChip({ instant, zone, className }: DateChipProps) {
  const day = dayKeyInZone(instant, zone);
  return (
    <div
      className={cn(
        'flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800 bg-primary-light/50 dark:bg-primary/10 py-4',
        className,
      )}
    >
      <span className="text-caption font-bold uppercase tracking-wider text-primary">
        {formatDay(day, { month: 'short' })}
      </span>
      <span className="font-display text-h1 leading-none text-primary">{parseDayKey(day).day}</span>
    </div>
  );
}
