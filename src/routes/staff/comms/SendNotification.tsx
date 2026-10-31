/**
 * @file SendNotification.tsx
 * @description Write a short notice and send it to members' bells (and email, unless they
 * turned that off). Unlike an announcement it isn't kept on a board: it lands once and is
 * read or dismissed.
 *
 * Like the announcement form, the preview is a required step and the send button says how
 * many people it will reach. The count is of members who have a login, because a member
 * without one cannot receive it: that number is shown separately rather than hidden.
 */
import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, CheckCircle2, Eye, Send, Users } from 'lucide-react';
import type { BroadcastResult, SendAudience } from '@/types';
import { commsService } from '@/services/commsService';
import { BODY_MAX, TITLE_MAX, newRequestKey, notificationsService } from '@/services/notificationsService';
import { Button, Card, Checkbox, Input, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

type Mode = 'compose' | 'preview' | 'done';
type Status = SendAudience['statuses'][number];

const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'active', label: 'Members' },
  { value: 'visitor', label: 'Visitors' },
  { value: 'prospect', label: 'Prospects' },
];

function people(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`;
}

export function SendNotification() {
  const [mode, setMode] = useState<Mode>('compose');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  // One key per send. A retry of the same send reuses it, so it can't be delivered twice;
  // a finished send gets a new one.
  const requestKey = useRef(newRequestKey());

  const audience: SendAudience = { unitIds, statuses };

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => commsService.listUnits() });
  const estimate = useQuery({
    queryKey: ['notification-audience', unitIds, statuses],
    queryFn: () => notificationsService.estimateSend({ unitIds, statuses }),
  });

  const send = useMutation({
    mutationFn: () =>
      notificationsService.send({ requestKey: requestKey.current, title: title.trim(), body: body.trim(), audience }),
    onSuccess: (outcome) => {
      setResult(outcome);
      setMode('done');
      requestKey.current = newRequestKey();
    },
  });

  const reachable = estimate.data?.withLogin ?? 0;
  const titleOk = title.trim().length > 0 && title.length <= TITLE_MAX;
  const bodyOk = body.trim().length > 0 && body.length <= BODY_MAX;

  function toggle<T extends string>(list: T[], set: (next: T[]) => void, value: T) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function reset() {
    setTitle('');
    setBody('');
    setUnitIds([]);
    setStatuses([]);
    setResult(null);
    send.reset();
    setMode('compose');
  }

  if (mode === 'done' && result) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
        <header className="flex items-center gap-3">
          <CheckCircle2 size={28} className="text-success shrink-0" aria-hidden />
          <div>
            <Text variant="h1">{result.alreadySent ? 'Already sent' : 'Sent'}</Text>
            <Text variant="body" color="muted">
              {result.alreadySent
                ? 'This notification went out earlier. Nothing new was sent.'
                : `${people(result.notified)} will see it in the app.`}
            </Text>
          </div>
        </header>

        <Card variant="flat" padding="md" className="space-y-2" role="status">
          <Row label="Members in this audience" value={String(result.audienceSize)} />
          <Row label="Notified" value={String(result.notified)} />
          {result.withoutLogin > 0 && (
            <Row label="No login, so not reachable here" value={String(result.withoutLogin)} />
          )}
          {result.optedOut > 0 && <Row label="Turned these off" value={String(result.optedOut)} />}
          {result.skipped > 0 && <Row label="Not an active member here" value={String(result.skipped)} />}
        </Card>
        {result.withoutLogin > 0 && (
          <Text variant="caption" color="muted" className="block">
            Members without a login need a call or a word after service. Inviting them to the portal lets them receive
            these next time.
          </Text>
        )}

        <Button variant="primary" size="lg" fullWidth leftIcon={Bell} onClick={reset}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          {mode === 'compose' ? 'Send a notification' : 'Check it before it goes'}
        </Text>
        <Text variant="body" color="muted">
          {mode === 'compose'
            ? 'A short notice to members’ phones. In the app, and by email unless they turned that off.'
            : 'You can’t take it back once it is sent.'}
        </Text>
      </header>

      {mode === 'compose' ? (
        <div className="space-y-5">
          <div className="space-y-1">
            <Input
              label="Title"
              autoFocus
              maxLength={TITLE_MAX}
              placeholder="Sunday service starts at 9:00 this week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Text variant="caption" color="muted" className="block text-right tabular-nums">
              {title.length}/{TITLE_MAX}
            </Text>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notification-body" className="text-label text-slate-700 dark:text-slate-300">
              Message
            </label>
            <textarea
              id="notification-body"
              rows={6}
              maxLength={BODY_MAX}
              placeholder="Say what they need to know and what to do."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark px-3 py-2.5 text-body text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Text variant="caption" color="muted" className="block text-right tabular-nums">
              {body.length}/{BODY_MAX}
            </Text>
          </div>

          <Card variant="outline" padding="md" className="space-y-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-primary shrink-0" aria-hidden />
              <div className="min-w-0">
                <Text variant="label" color="muted">
                  Who gets it
                </Text>
                <Text variant="body" aria-live="polite" className={cn(estimate.isFetching && 'opacity-60')}>
                  {estimate.isError
                    ? 'Couldn’t count the audience'
                    : estimate.data
                      ? `${people(estimate.data.withLogin)} with a login${
                          estimate.data.withoutLogin > 0 ? ` (${estimate.data.withoutLogin} more have none)` : ''
                        }`
                      : 'Counting…'}
                </Text>
              </div>
            </div>

            <div>
              <Text variant="label" color="muted" className="mb-1 block">
                Status — leave all unticked for everyone
              </Text>
              {STATUS_OPTIONS.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={statuses.includes(option.value)}
                  onChange={() => toggle(statuses, setStatuses, option.value)}
                />
              ))}
            </div>

            {units.length > 0 && (
              <div>
                <Text variant="label" color="muted" className="mb-1 block">
                  Branch — leave all unticked for everywhere you may send
                </Text>
                {units.map((unit) => (
                  <Checkbox
                    key={unit.id}
                    label={unit.name}
                    checked={unitIds.includes(unit.id)}
                    onChange={() => toggle(unitIds, setUnitIds, unit.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {estimate.isError && (
            <Text variant="caption" color="danger" role="alert" className="block">
              {estimate.error instanceof Error ? estimate.error.message : 'Try again.'}
            </Text>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={Eye}
            disabled={!titleOk || !bodyOk || reachable === 0}
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
          {estimate.data && reachable === 0 && (
            <Text variant="caption" color="muted" className="block text-center">
              Nobody with a login matches this audience yet.
            </Text>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* How it reads in the bell */}
          <Card padding="lg" accent="primary">
            <Text variant="h2" className="mb-2">
              {title.trim()}
            </Text>
            <Text variant="body-lg" className="whitespace-pre-line">
              {body.trim()}
            </Text>
          </Card>

          <Card variant="flat" padding="md" className="space-y-2">
            <Row label="Going to" value={people(reachable)} />
            {(estimate.data?.withoutLogin ?? 0) > 0 && (
              <Row label="Members with no login (won’t get it)" value={String(estimate.data?.withoutLogin)} />
            )}
          </Card>

          {send.isError && (
            <Text variant="body-sm" color="danger" role="alert" className="block">
              {send.error instanceof Error ? send.error.message : 'It couldn’t be sent. Try again.'}
            </Text>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Send}
            isLoading={send.isPending}
            disabled={reachable === 0}
            onClick={() => send.mutate()}
          >
            Send to {people(reachable)}
          </Button>
          <Button variant="ghost" fullWidth leftIcon={ArrowLeft} disabled={send.isPending} onClick={() => setMode('compose')}>
            Keep editing
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <Text variant="body-sm" color="muted">
        {label}
      </Text>
      <Text variant="body-sm" className="font-medium tabular-nums">
        {value}
      </Text>
    </div>
  );
}
