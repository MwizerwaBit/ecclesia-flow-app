/**
 * @file AnnouncementBoard.tsx
 * @description What the congregation sees — pinned notices, then recent ones.
 *
 * The member-facing counterpart to the staff announcements list. No status
 * chips, no delivery stats, no drafts: a member only ever sees what was actually
 * sent to them.
 */
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Pin } from 'lucide-react';
import { commsService } from '@/services/commsService';
import { Card, EmptyState, Text } from '@/components/ui';
import { formatRelative } from '@/lib/formatters';

export function AnnouncementBoard() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', 'sent'],
    queryFn: () => commsService.listAnnouncements({ status: 'sent' }),
  });

  const pinned = announcements.filter((a) => a.isPinned);
  const rest = announcements.filter((a) => !a.isPinned);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Notices
        </Text>
        <Text variant="body" color="muted">
          From your church.
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading notices…
        </Text>
      )}

      {!isLoading && announcements.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="Nothing just now"
          description="Announcements from your church will appear here."
        />
      )}

      {pinned.length > 0 && (
        <div className="space-y-3 mb-6">
          {pinned.map((announcement) => (
            <Card
              key={announcement.id}
              padding="lg"
              variant="outline"
              className="border-primary/30 bg-primary-light/30 dark:bg-primary/10"
            >
              <div className="flex items-center gap-1.5 mb-2 text-primary">
                <Pin size={13} aria-hidden />
                <Text variant="label" className="text-primary">
                  Pinned
                </Text>
              </div>

              <Text variant="h2" className="mb-2">
                {announcement.title}
              </Text>

              <div
                className="space-y-2 text-body text-slate-700 dark:text-slate-300 [&_p]:leading-relaxed"
                // Authored by this tenant's own staff and stored as HTML.
                dangerouslySetInnerHTML={{ __html: announcement.body }}
              />

              <Text variant="caption" color="muted" className="block mt-3">
                {announcement.authorName}
                {announcement.sentAt ? ` · ${formatRelative(announcement.sentAt)}` : ''}
              </Text>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rest.map((announcement) => (
          <Card key={announcement.id} padding="lg">
            <Text variant="h3" className="mb-2">
              {announcement.title}
            </Text>

            <div
              className="space-y-2 text-body text-slate-700 dark:text-slate-300 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: announcement.body }}
            />

            <Text variant="caption" color="muted" className="block mt-3">
              {announcement.authorName}
              {announcement.sentAt ? ` · ${formatRelative(announcement.sentAt)}` : ''}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
