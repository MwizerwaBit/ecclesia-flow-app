/**
 * @file AnnouncementDetail.tsx
 * @description One announcement, with how it actually landed.
 *
 * Delivery stats matter more than the text here — staff open this screen to find
 * out whether a message got through. Undelivered mail is surfaced as an action,
 * not a statistic, because a bounced address stays broken until someone fixes it.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Mail, MailOpen, Pin, RefreshCw, Send, Smartphone } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commsService } from '@/services/commsService';
import { Badge, Button, Card, StatTile, Text } from '@/components/ui';
import { formatDate, formatDateTime, formatPercent } from '@/lib/formatters';

export function AnnouncementDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const retry = useMutation({
    mutationFn: () => commsService.retryFailedDeliveries(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcement', id] }),
  });

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => commsService.getAnnouncement(id),
    enabled: Boolean(id),
  });

  if (isLoading || !announcement) {
    return (
      <Text variant="body" color="muted" className="text-center py-16">
        Loading announcement…
      </Text>
    );
  }

  const sent = announcement.sentCount ?? 0;
  const delivered = announcement.deliveredCount ?? 0;
  const opened = announcement.openedCount ?? 0;
  const failed = Math.max(0, sent - delivered);
  const isSent = announcement.status === 'sent';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 min-w-0">
            {announcement.isPinned && (
              <Pin size={18} className="text-primary shrink-0 mt-1.5" aria-label="Pinned" />
            )}
            <Text variant="h1" className="min-w-0">
              {announcement.title}
            </Text>
          </div>
          <Badge
            variant={
              announcement.status === 'sent'
                ? 'success'
                : announcement.status === 'scheduled'
                  ? 'warning'
                  : 'neutral'
            }
            dot
            className="shrink-0"
          >
            {announcement.status}
          </Badge>
        </div>

        <Text variant="body-sm" color="muted">
          {announcement.authorName}
          {announcement.sentAt && ` · sent ${formatDateTime(announcement.sentAt)}`}
          {announcement.scheduledAt && ` · goes out ${formatDateTime(announcement.scheduledAt)}`}
          {!announcement.sentAt &&
            !announcement.scheduledAt &&
            ` · drafted ${formatDate(announcement.createdAt)}`}
        </Text>
      </header>

      {/* The message itself, as the congregation reads it */}
      <Card padding="lg">
        <div
          className="space-y-3 text-body-lg text-slate-700 dark:text-slate-300 [&_p]:leading-relaxed"
          // Body is authored by church staff in this tenant, stored as HTML.
          dangerouslySetInnerHTML={{ __html: announcement.body }}
        />
      </Card>

      {/* Delivery */}
      {isSent ? (
        <div>
          <Text variant="h2" className="mb-3">
            How it landed
          </Text>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatTile label="Sent" value={String(sent)} icon={Send} />
            <StatTile label="Delivered" value={String(delivered)} icon={Mail} />
            <StatTile
              label="Opened"
              value={String(opened)}
              icon={MailOpen}
              hint={delivered > 0 ? formatPercent(opened / delivered, 0) : undefined}
            />
          </div>

          {failed > 0 && (
            <Card variant="outline" padding="md" className="border-warning/40 bg-warning-light/40">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
                <div className="flex-1">
                  <Text variant="h3" className="mb-0.5">
                    {failed} did not arrive
                  </Text>
                  <Text variant="body-sm" color="muted">
                    Usually an address that has changed. Retrying will not affect anyone who
                    already received it.
                  </Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    leftIcon={RefreshCw}
                    isLoading={retry.isPending}
                    onClick={() => retry.mutate()}
                  >
                    Retry the {failed} that failed
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card variant="flat" padding="md" className="flex items-center gap-3">
          <Send size={20} className="text-slate-400 shrink-0" aria-hidden />
          <Text variant="body" color="muted">
            {announcement.status === 'scheduled'
              ? `Waiting to go out on ${formatDate(announcement.scheduledAt ?? '')}.`
              : 'Not sent yet — this is still a draft.'}
          </Text>
        </Card>
      )}

      {/* Audience and channels */}
      <Card variant="outline" padding="md" className="space-y-2">
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Audience
          </Text>
          <Text variant="body-sm" className="font-medium">
            {announcement.audienceFilter?.estimatedCount
              ? `${announcement.audienceFilter.estimatedCount} people`
              : 'Whole congregation'}
          </Text>
        </div>
        <div className="flex justify-between gap-3">
          <Text variant="body-sm" color="muted">
            Channels
          </Text>
          <span className="flex items-center gap-2 text-slate-500">
            {announcement.channels.includes('email') && <Mail size={15} aria-label="Email" />}
            {announcement.channels.includes('in_app') && (
              <Smartphone size={15} aria-label="Portal" />
            )}
          </span>
        </div>
      </Card>

      <Link to="/staff/comms/announcements">
        <Button variant="ghost" fullWidth>
          Back to announcements
        </Button>
      </Link>
    </div>
  );
}
