/**
 * @file NotificationPreferences.tsx
 * @description A grid of what reaches you, and by which channel.
 *
 * Pastoral alerts default on across every channel and finance alerts default to
 * email: the cost of a missed pastoral alert is someone going unvisited, so the
 * defaults lean toward telling you. Nothing here is mandatory except the
 * security channel, which cannot be silenced.
 */
import { useState } from 'react';
import { Bell, Check, HeartHandshake, Info, Mail, Smartphone, Wallet } from 'lucide-react';
import type { NotificationChannel, NotificationType } from '@/types';
import { Card, Text } from '@/components/ui';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const CHANNELS: Array<{ value: NotificationChannel; label: string; icon: typeof Mail }> = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'in_app', label: 'In app', icon: Bell },
];

const TYPES: Array<{
  value: NotificationType;
  label: string;
  description: string;
  icon: typeof Mail;
  /** Security-critical alerts cannot be turned off. */
  locked?: boolean;
}> = [
  {
    value: 'pastoral_alert',
    label: 'Pastoral alerts',
    description: 'A member has not been seen, or a visitor is waiting for follow-up',
    icon: HeartHandshake,
  },
  {
    value: 'finance_alert',
    label: 'Finance alerts',
    description: 'A batch is left open, or a giving discrepancy is recorded',
    icon: Wallet,
  },
  {
    value: 'announcement',
    label: 'Announcements',
    description: 'Anything published to the congregation',
    icon: Bell,
  },
  {
    value: 'system',
    label: 'Security and system',
    description: 'Sign-ins from a new device, permission changes, outages',
    icon: Info,
    locked: true,
  },
];

type Preferences = Record<NotificationType, Record<NotificationChannel, boolean>>;

const DEFAULTS: Preferences = {
  pastoral_alert: { email: true, push: true, in_app: true, sms: false },
  finance_alert: { email: true, push: false, in_app: true, sms: false },
  announcement: { email: false, push: false, in_app: true, sms: false },
  system: { email: true, push: true, in_app: true, sms: false },
};

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [isSaved, setSaved] = useState(false);

  function toggle(type: NotificationType, channel: NotificationChannel) {
    setPreferences((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  }

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Notifications
        </Text>
        <Text variant="body" color="muted">
          Choose what reaches you, and how it arrives.
        </Text>
      </header>

      <div className="space-y-3">
        {TYPES.map((type) => {
          const Icon = type.icon;

          return (
            <Card key={type.value} padding="md">
              <div className="flex items-start gap-3 mb-4">
                <Icon size={20} className="text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <Text variant="h3">{type.label}</Text>
                  <Text variant="caption" color="muted">
                    {type.description}
                  </Text>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map((channel) => {
                  const ChannelIcon = channel.icon;
                  const isOn = preferences[type.value][channel.value];

                  return (
                    <button
                      key={channel.value}
                      type="button"
                      disabled={type.locked}
                      onClick={() => toggle(type.value, channel.value)}
                      aria-pressed={isOn}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border py-2.5 transition-all duration-fast',
                        isOn
                          ? 'bg-primary-light dark:bg-primary/15 border-primary text-primary'
                          : 'bg-surface dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-slate-400',
                        type.locked && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      <ChannelIcon size={17} aria-hidden />
                      <span className="text-caption font-medium">{channel.label}</span>
                    </button>
                  );
                })}
              </div>

              {type.locked && (
                <Text variant="caption" color="muted" className="block mt-2">
                  These cannot be turned off — they protect your account.
                </Text>
              )}
            </Card>
          );
        })}
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={save}>
        {isSaved ? 'Saved' : 'Save preferences'}
      </Button>

      {isSaved && (
        <div className="flex items-center justify-center gap-2 animate-fade-in">
          <Check size={16} className="text-success" aria-hidden />
          <Text variant="body-sm" className="text-success">
            Preferences saved.
          </Text>
        </div>
      )}
    </div>
  );
}
