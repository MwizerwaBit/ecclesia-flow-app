/**
 * @file CreateAnnouncement.tsx
 * @description Write, choose who hears it, and see it before anyone else does.
 *
 * Sending is irreversible in the way that matters — you cannot unsend an email to
 * 248 people — so the preview is a required step rather than an optional one, and
 * the send button states the recipient count out loud.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Mail, Pencil, Pin, Send, Smartphone, Users } from 'lucide-react';
import type { AudienceFilter, NotificationChannel } from '@/types';
import { commsService } from '@/services/commsService';
import { AudienceBuilderSheet } from './AudienceBuilderSheet';
import { Button, Card, Checkbox, Input, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Mode = 'compose' | 'preview';

export function CreateAnnouncement() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('compose');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setPinned] = useState(false);
  const [channels, setChannels] = useState<NotificationChannel[]>(['email', 'in_app']);
  const [audience, setAudience] = useState<AudienceFilter>({});
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isAudienceSheetOpen, setAudienceSheetOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const save = useMutation({
    mutationFn: (status: 'draft' | 'sent' | 'scheduled') =>
      commsService.createAnnouncement({
        title: title.trim(),
        // Plain paragraphs become HTML — the stored format the portal renders.
        body: body
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${paragraph.trim()}</p>`)
          .join(''),
        isPinned,
        channels,
        audienceFilter: { ...audience, estimatedCount: recipientCount ?? undefined },
        status,
        scheduledAt: status === 'scheduled' ? scheduledAt : undefined,
        sentAt: status === 'sent' ? new Date().toISOString() : undefined,
      }),
    onSuccess: () => navigate('/staff/comms/announcements'),
  });

  function toggleChannel(channel: NotificationChannel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  const audienceLabel =
    recipientCount === null
      ? 'Everyone in the congregation'
      : `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          {mode === 'compose' ? 'New announcement' : 'Preview'}
        </Text>
        <Text variant="body" color="muted">
          {mode === 'compose'
            ? 'Say it once, clearly.'
            : 'This is what your congregation will see.'}
        </Text>
      </header>

      {mode === 'compose' ? (
        <div className="space-y-5">
          <Input
            label="Title"
            autoFocus
            placeholder="Harvest Thanksgiving — Sunday 3 November"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="announcement-body" className="text-label text-slate-700 dark:text-slate-300">
              Message
            </label>
            <textarea
              id="announcement-body"
              rows={8}
              placeholder="Write as you would say it from the front."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Text variant="caption" color="muted">
              Leave a blank line between paragraphs.
            </Text>
          </div>

          {/* Audience */}
          <Card variant="outline" padding="md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Users size={20} className="text-primary shrink-0" aria-hidden />
                <div className="min-w-0">
                  <Text variant="label" color="muted">
                    Audience
                  </Text>
                  <Text variant="body" className="truncate">
                    {audienceLabel}
                  </Text>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setAudienceSheetOpen(true)}>
                Change
              </Button>
            </div>
          </Card>

          {/* Channels */}
          <div>
            <Text variant="label" color="muted" className="mb-2 block">
              Send by
            </Text>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'email' as const, label: 'Email', icon: Mail },
                  { value: 'in_app' as const, label: 'In the portal', icon: Smartphone },
                ]
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleChannel(value)}
                  aria-pressed={channels.includes(value)}
                  className={cn(
                    'flex items-center justify-center gap-2 h-12 rounded-lg border text-body font-medium transition-all duration-fast',
                    channels.includes(value)
                      ? 'bg-primary-light dark:bg-primary/15 border-primary text-primary'
                      : 'bg-surface dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-slate-500',
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Checkbox
            label="Pin to the top of the board"
            description="Only three announcements can be pinned at once."
            checked={isPinned}
            onChange={(e) => setPinned(e.target.checked)}
          />

          <Input
            label="Schedule for later"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={Eye}
            disabled={!canSend}
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>

          <Button
            variant="ghost"
            fullWidth
            size="sm"
            isLoading={save.isPending}
            onClick={() => save.mutate('draft')}
          >
            Save as draft
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Rendered the way the member portal renders it */}
          <Card padding="lg">
            {isPinned && (
              <div className="flex items-center gap-1.5 mb-3 text-primary">
                <Pin size={14} aria-hidden />
                <Text variant="label" className="text-primary">
                  Pinned
                </Text>
              </div>
            )}
            <Text variant="h2" className="mb-3">
              {title}
            </Text>
            <div className="space-y-3">
              {body.split(/\n{2,}/).map((paragraph, i) => (
                <Text key={i} variant="body-lg">
                  {paragraph.trim()}
                </Text>
              ))}
            </div>
          </Card>

          <Card variant="flat" padding="md" className="space-y-2">
            <div className="flex justify-between">
              <Text variant="body-sm" color="muted">
                Going to
              </Text>
              <Text variant="body-sm" className="font-medium">
                {audienceLabel}
              </Text>
            </div>
            <div className="flex justify-between">
              <Text variant="body-sm" color="muted">
                By
              </Text>
              <Text variant="body-sm" className="font-medium">
                {channels.length === 0
                  ? 'No channel selected'
                  : channels.map((c) => (c === 'email' ? 'Email' : 'Portal')).join(' and ')}
              </Text>
            </div>
            {scheduledAt && (
              <div className="flex justify-between">
                <Text variant="body-sm" color="muted">
                  Scheduled
                </Text>
                <Text variant="body-sm" className="font-medium">
                  {formatDate(scheduledAt)}
                </Text>
              </div>
            )}
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Send}
            disabled={channels.length === 0}
            isLoading={save.isPending}
            onClick={() => save.mutate(scheduledAt ? 'scheduled' : 'sent')}
          >
            {scheduledAt
              ? 'Schedule announcement'
              : `Send to ${recipientCount ?? 'everyone'}${recipientCount === null ? '' : ' people'}`}
          </Button>

          <Button variant="ghost" fullWidth leftIcon={ArrowLeft} onClick={() => setMode('compose')}>
            Keep editing
          </Button>
        </div>
      )}

      {mode === 'compose' && (
        <Button
          variant="link"
          fullWidth
          leftIcon={Pencil}
          className="mt-6"
          onClick={() => navigate('/staff/comms/announcements')}
        >
          Discard and go back
        </Button>
      )}

      {isAudienceSheetOpen && (
        <AudienceBuilderSheet
          onClose={() => setAudienceSheetOpen(false)}
          filter={audience}
          onApply={(nextFilter, count) => {
            setAudience(nextFilter);
            setRecipientCount(count);
          }}
        />
      )}
    </div>
  );
}
