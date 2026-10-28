/**
 * @file IdleTimeoutSetting.tsx
 * @description How long a leader-side session may sit idle before it is signed out.
 *
 * Applies to the leader, administrators, staff and custom roles of this church.
 * Members are always signed out after an hour and platform staff after fifteen
 * minutes; neither is configurable. Changing it needs the `org:settings`
 * permission and a two-step-verified session, and is written to the audit log.
 * People already signed in get the new limit the next time their session
 * refreshes or they sign in again.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import { orgService } from '@/services/orgService';
import { errorMessage } from '@/lib/errors';
import { toast } from '@/hooks/useToastStore';
import { Button, Card, Input, Text } from '@/components/ui';

export function IdleTimeoutSetting() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['org', 'security'], queryFn: () => orgService.getSecurity() });
  const [draft, setDraft] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (minutes: number) => orgService.setIdleMinutes(minutes),
    meta: { inline: true },
    onSuccess: (saved) => {
      queryClient.setQueryData(['org', 'security'], saved);
      setDraft(null);
      toast.success(`Leaders are now signed out after ${saved.sessionIdleMinutes} minutes of inactivity`);
    },
  });

  if (!data) return null;

  const value = draft ?? String(data.sessionIdleMinutes);
  const minutes = Number(value);
  const valid = Number.isInteger(minutes) && minutes >= data.minMinutes && minutes <= data.maxMinutes;
  const changed = valid && minutes !== data.sessionIdleMinutes;

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-start gap-3">
        <Timer size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <div>
          <Text variant="h3">Automatic sign-out</Text>
          <Text variant="body-sm" color="muted">
            The leader, administrators and staff are signed out after this long with no activity. Members are always
            signed out after {data.memberMinutes} minutes.
          </Text>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label={`Minutes (${data.minMinutes} to ${data.maxMinutes})`}
          type="number"
          inputMode="numeric"
          min={data.minMinutes}
          max={data.maxMinutes}
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          error={!valid ? `Choose a whole number from ${data.minMinutes} to ${data.maxMinutes}` : undefined}
          className="w-48"
        />
        <Button onClick={() => save.mutate(minutes)} disabled={!changed} isLoading={save.isPending}>
          Save
        </Button>
      </div>

      {save.isError && (
        <div role="alert" className="text-body-sm text-danger">
          {errorMessage(save.error)}
        </div>
      )}
      <Text variant="caption" color="muted">
        Shorter is safer on shared computers. Anyone already signed in gets the new limit the next time they sign in or
        their session refreshes.
      </Text>
    </Card>
  );
}
