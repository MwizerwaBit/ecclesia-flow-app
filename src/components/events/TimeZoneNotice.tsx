/**
 * @file TimeZoneNotice.tsx
 * @description A heads-up for staff when the church's time zone was never set.
 *
 * A church starts on "UTC" and nothing asks it to change that, so event times
 * typed in the form and shown on the calendar are on the UTC clock, which is
 * wrong for a church anywhere else. The notice shows only when the church's zone
 * is still UTC while this browser's is not (a sign the person is not in UTC) and
 * links to Settings, where the zone is set. Staff screens only: the notice
 * points at a staff page.
 *
 * Props contract
 *   zone       string   the church's zone, as the screen resolved it (useChurchTimeZone,
 *                       or the calendar window's own `timezone`)
 *   className  string   spacing from the parent, applied only while the notice shows
 */
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Card, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { isUnsetTimeZone } from './unsetTimeZone';

export function TimeZoneNotice({ zone, className }: { zone: string; className?: string }) {
  if (!isUnsetTimeZone(zone)) return null;

  return (
    <Card accent="warning" variant="outline" padding="sm" role="status" className={cn('flex items-start gap-3', className)}>
      <Globe size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <Text variant="body-sm">Your church’s time zone isn’t set, so times show in UTC.</Text>
        <Link
          to="/staff/settings"
          className="inline-flex min-h-11 items-center text-body-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Set it in Settings
        </Link>
      </div>
    </Card>
  );
}
