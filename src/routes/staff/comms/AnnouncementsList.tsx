/**
 * @file AnnouncementsList.tsx
 * @description Everything the church has said, and everything it is about to say.
 *
 * Pinned announcements sit at the top and are capped at three — a pinned board
 * where everything is pinned communicates nothing. Drafts and scheduled items
 * are mixed into the same list rather than hidden behind a tab, because the
 * thing staff forget is the announcement they started and never sent.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, Mail, Megaphone, Pin, Plus, Smartphone } from 'lucide-react';
import type { Announcement, AnnouncementStatus } from '@/types';
import { commsService } from '@/services/commsService';
import { Badge, Button, Card, EmptyState, Fab, SegmentedControl, Text } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/formatters';

type Filter = 'all' | 'draft' | 'scheduled' | 'sent';

const STATUS_BADGE: Record<
  AnnouncementStatus,
  { variant: 'neutral' | 'warning' | 'success' | 'info'; label: string }
> = {
  draft: { variant: 'neutral', label: 'Draft' },
  scheduled: { variant: 'warning', label: 'Scheduled' },
  sent: { variant: 'success', label: 'Sent' },
  archived: { variant: 'neutral', label: 'Archived' },
};

/** Announcement bodies are stored as HTML; the list needs a plain-text preview. */
function toPreview(html: string, maxLength = 120): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const badge = STATUS_BADGE[announcement.status];

  return (
    <Card padding="none" variant="elevated">
      <Link
        to={`/staff/comms/announcements/${announcement.id}`}
        className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-start gap-2 min-w-0">
            {announcement.isPinned && (
              <Pin size={15} className="text-primary shrink-0 mt-1" aria-label="Pinned" />
            )}
            <Text variant="h3" className="min-w-0">
              {announcement.title}
            </Text>
          </div>
          <Badge variant={badge.variant} size="sm" className="shrink-0">
            {badge.label}
          </Badge>
        </div>

        <Text variant="body-sm" color="muted" className="mb-3">
          {toPreview(announcement.body)}
        </Text>

        <div className="flex items-center justify-between gap-3">
          <Text variant="caption" color="muted" className="truncate">
            {announcement.authorName}
            {announcement.sentAt && ` · sent ${formatRelative(announcement.sentAt)}`}
            {announcement.scheduledAt && ` · goes out ${formatDate(announcement.scheduledAt)}`}
          </Text>

          <div className="flex items-center gap-2 shrink-0 text-slate-400">
            {announcement.channels.includes('email') && <Mail size={14} aria-label="Email" />}
            {announcement.channels.includes('in_app') && (
              <Smartphone size={14} aria-label="In-app" />
            )}
            {announcement.status === 'scheduled' && <Clock size={14} aria-label="Scheduled" />}
          </div>
        </div>

        {announcement.status === 'sent' && announcement.openedCount !== undefined && (
          <Text variant="caption" color="muted" className="block mt-2 tabular-nums">
            {announcement.openedCount} of {announcement.sentCount} opened
          </Text>
        )}
      </Link>
    </Card>
  );
}

export function AnnouncementsList() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', filter],
    queryFn: () => commsService.listAnnouncements(filter === 'all' ? undefined : { status: filter }),
  });

  // Three is the cap the pinned board is designed around.
  const pinned = announcements.filter((a) => a.isPinned).slice(0, 3);
  const rest = announcements.filter((a) => !pinned.includes(a));

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-5">
        <Text variant="h1" className="mb-1">
          Announcements
        </Text>
        <Text variant="body" color="muted">
          What your congregation sees in their portal and inbox.
        </Text>
      </header>

      <SegmentedControl
        label="Announcement status"
        value={filter}
        onChange={setFilter}
        size="sm"
        className="mb-5"
        options={[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Drafts' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'sent', label: 'Sent' },
        ]}
      />

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading announcements…
        </Text>
      )}

      {!isLoading && announcements.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={filter === 'all' ? 'Nothing announced yet' : `No ${filter} announcements`}
          description="Announcements reach your congregation by email and in their portal."
          action={
            <Link to="/staff/comms/announcements/new">
              <Button variant="primary" leftIcon={Plus}>
                Write an announcement
              </Button>
            </Link>
          }
        />
      )}

      {pinned.length > 0 && (
        <div className="mb-6">
          <Text variant="label" color="muted" className="mb-2 block">
            Pinned · {pinned.length} of 3
          </Text>
          <div className="space-y-3">
            {pinned.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <Text variant="label" color="muted" className="mb-2 block">
              Everything else
            </Text>
          )}
          <div className="space-y-3">
            {rest.map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </div>
      )}

      <Link to="/staff/comms/announcements/new">
        <Fab icon={Plus} label="New announcement" />
      </Link>
    </div>
  );
}
