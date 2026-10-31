/**
 * @file NotificationPreferencesView.tsx
 * @description What reaches you, and by which channel — live against the API.
 *
 * Email and in-app are real; push and SMS are shown but off ("Soon"), so the page says what
 * will exist without pretending it does. Each switch saves the moment it is pressed and flips
 * back if the server says no. Where the in-app copy can't be turned off (approvals, plan and
 * payments) the switch is locked on and says why: the bell is the only in-app place those show.
 */
import { Bell, Mail, MessageSquareText, Smartphone, type LucideIcon } from 'lucide-react';
import type { NotificationChannel, NotificationType } from '@/types';
import { Button, Card, Skeleton, Text } from '@/components/ui';
import { usePreferences, useUpdatePreferences } from '@/hooks/useNotifications';
import { useRole } from '@/hooks/useRole';
import {
  IN_APP_ALWAYS,
  NOTIFICATION_TYPE_INFO,
  NOTIFICATION_TYPE_ORDER,
} from '@/lib/notifications';
import { cn } from '@/lib/cn';

const CHANNELS: Array<{ value: NotificationChannel; label: string; icon: LucideIcon; live: boolean }> = [
  { value: 'email', label: 'Email', icon: Mail, live: true },
  { value: 'in_app', label: 'In the app', icon: Bell, live: true },
  { value: 'push', label: 'Push', icon: Smartphone, live: false },
  { value: 'sms', label: 'SMS', icon: MessageSquareText, live: false },
];

export function NotificationPreferencesView() {
  const prefs = usePreferences();
  const update = useUpdatePreferences();
  const { isMember } = useRole();

  // Members don't receive the kinds that are for people who run the church.
  const types = NOTIFICATION_TYPE_ORDER.filter((t) => !(isMember && NOTIFICATION_TYPE_INFO[t].staffOnly));

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in space-y-6 px-4 py-6">
      <header>
        <Text variant="h1" className="mb-1">
          Notification settings
        </Text>
        <Text variant="body" color="muted">
          Choose what reaches you, and how it arrives.
        </Text>
      </header>

      {prefs.isLoading && (
        <div className="space-y-3" aria-label="Loading settings">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {prefs.isError && (
        <Card padding="md" accent="danger" role="alert">
          <Text variant="body" className="mb-2">
            Your settings couldn’t be loaded.
          </Text>
          <Button variant="secondary" size="sm" onClick={() => prefs.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {prefs.data && (
        <div className="space-y-3">
          {types.map((type) => (
            <TypeCard
              key={type}
              type={type}
              values={prefs.data.preferences[type]}
              onChange={(channel, on) => update.mutate({ [type]: { [channel]: on } })}
            />
          ))}
        </div>
      )}

      <div aria-live="polite" className="min-h-5">
        {update.isPending && (
          <Text variant="caption" color="muted">
            Saving…
          </Text>
        )}
        {update.isError && (
          <Text variant="caption" color="danger" role="alert">
            {update.error instanceof Error ? update.error.message : 'That change couldn’t be saved.'}
          </Text>
        )}
      </div>
    </div>
  );
}

function TypeCard({
  type,
  values,
  onChange,
}: {
  type: NotificationType;
  values: Record<NotificationChannel, boolean> | undefined;
  onChange: (channel: NotificationChannel, on: boolean) => void;
}) {
  const info = NOTIFICATION_TYPE_INFO[type];
  const Icon = info.icon;
  const inAppLocked = IN_APP_ALWAYS.has(type);

  return (
    <Card padding="md">
      <div className="mb-4 flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <Text variant="h3">{info.label}</Text>
          <Text variant="caption" color="muted">
            {info.description}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={`${info.label}: how it reaches you`}>
        {CHANNELS.map((channel) => {
          const ChannelIcon = channel.icon;
          const locked = channel.value === 'in_app' && inAppLocked;
          const on = channel.live ? Boolean(values?.[channel.value]) || locked : false;
          const disabled = !channel.live || locked;
          return (
            <button
              key={channel.value}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              aria-label={`${channel.label}${!channel.live ? ' (coming soon)' : locked ? ' (always on)' : ''}`}
              onClick={() => onChange(channel.value, !on)}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 transition-all duration-fast',
                on
                  ? 'border-primary bg-primary-light text-primary dark:bg-primary/15'
                  : 'border-slate-200 bg-surface text-slate-400 dark:border-slate-700 dark:bg-surface-dark',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <ChannelIcon size={17} aria-hidden />
              <span className="text-caption font-medium">{channel.label}</span>
              {!channel.live && <span className="text-[10px] uppercase tracking-wide">Soon</span>}
              {locked && <span className="text-[10px] uppercase tracking-wide">Always on</span>}
            </button>
          );
        })}
      </div>

      {inAppLocked && (
        <Text variant="caption" color="muted" className="mt-2 block">
          These always show in the app, because that is where you’d act on them.
        </Text>
      )}
    </Card>
  );
}
