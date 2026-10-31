/**
 * @file ChurchTimeZoneSetting.tsx
 * @description The church's time zone: where its events and repeating services sit on a day.
 *
 * A 09:00 Sunday service stays at 09:00 on both sides of a daylight-saving change
 * because the calendar places it in this zone. It is an organisation setting, so
 * the API needs the `org:settings` permission and a two-step-verified session; the
 * error says so rather than failing quietly.
 *
 * Existing events are stored as instants, so changing the zone re-times them: a
 * 09:00 event saved while the zone was UTC reads 11:00 once it is Africa/Kigali.
 * The setting says so before the change is saved.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orgService } from '@/services/orgService';
import { isKnownZone } from '@/lib/calendar';
import { errorMessage } from '@/lib/errors';
import { toast } from '@/hooks/useToastStore';
import { Button, Select, Text } from '@/components/ui';

/** Fallback when the browser cannot list zones: the ones churches here are most likely in. */
const COMMON_ZONES = [
  'UTC',
  'Africa/Kigali',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

function allZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones.includes('UTC') ? zones : ['UTC', ...zones];
  } catch {
    // fall through
  }
  return COMMON_ZONES;
}

export function ChurchTimeZoneSetting({ editable }: { editable: boolean }) {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['org', 'profile'], queryFn: () => orgService.getProfile() });
  const [draft, setDraft] = useState<string | null>(null);

  const zones = useMemo(() => {
    const list = allZones();
    const current = profile?.timezone;
    return current && !list.includes(current) && isKnownZone(current) ? [current, ...list] : list;
  }, [profile?.timezone]);

  const save = useMutation({
    mutationFn: (timezone: string) => orgService.updateProfile({ timezone }),
    meta: { inline: true },
    onSuccess: (saved) => {
      queryClient.setQueryData(['org', 'profile'], saved);
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      setDraft(null);
      toast.success(`Time zone set to ${saved.timezone}`);
    },
  });

  const value = draft ?? profile?.timezone ?? '';
  const changed = draft !== null && draft !== profile?.timezone;

  return (
    <div className="space-y-2">
      <Select
        label="Time zone"
        value={value}
        disabled={!editable || !profile}
        onChange={(e) => setDraft(e.target.value)}
        options={zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))}
      />
      <Text variant="caption" color="muted">
        Your gatherings are placed in this zone, so a 9:00 service stays at 9:00 when the clocks change.
        {!editable && ' Only an administrator can change it.'}
      </Text>
      {editable && (
        <Text variant="caption" className="block text-amber-800 dark:text-amber-300">
          Changing the time zone re-times the gatherings you have already created: an event entered as 09:00 UTC
          becomes 11:00 in Kigali. Check your calendar afterwards.
        </Text>
      )}
      {editable && changed && (
        <Button size="sm" onClick={() => save.mutate(draft!)} isLoading={save.isPending}>
          Save time zone
        </Button>
      )}
      {save.isError && (
        <div role="alert" className="text-body-sm text-danger">
          {errorMessage(save.error)}
        </div>
      )}
    </div>
  );
}
