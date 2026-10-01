/**
 * @file NotSeenRecently.tsx
 * @description Members absent four weeks or more.
 *
 * This is a pastoral prompt, not a compliance report, so the language stays
 * warm and the absence is expressed in weeks rather than a bare date. One tap
 * to reach out is the only action — deciding what to say is not this screen's job.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HeartHandshake, Mail, MessageCircle, Phone } from 'lucide-react';
import { membersService } from '@/services/membersService';
import { Avatar, Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';

/** Absence in weeks, rounded down — how staff actually talk about it. */
function weeksSince(isoDate: string): number {
  const elapsed = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)));
}

export function NotSeenRecently() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', 'not-seen-recently'],
    queryFn: () => membersService.getNotSeenRecently(),
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <header className="mb-6">
        <Text variant="h1" className="mb-1">
          Not seen recently
        </Text>
        <Text variant="body" color="muted">
          {members.length === 0
            ? 'Everyone has been at a gathering in the last month.'
            : `${members.length} ${members.length === 1 ? 'person has' : 'people have'} been away four weeks or more.`}
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Checking the register…
        </Text>
      )}

      {!isLoading && members.length === 0 && (
        <EmptyState
          icon={HeartHandshake}
          title="Nobody has slipped away"
          description="Anyone who misses four weeks of gatherings will appear here."
        />
      )}

      <div className="grid gap-2.5 xl:grid-cols-2">
        {members.map((member) => {
          const weeks = member.lastSeenAt ? weeksSince(member.lastSeenAt) : null;

          return (
            <Card key={member.id} padding="none" variant="elevated">
              <div className="flex items-center gap-3 p-4">
                <Avatar
                  src={member.photoUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="md"
                  className="shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <Link to={`/staff/members/${member.id}`}>
                    <p className="font-member-name text-h3 truncate text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
                      {member.firstName} {member.lastName}
                    </p>
                  </Link>
                  <Text variant="caption" color="muted">
                    {member.unitName ?? 'No group'}
                    {member.lastSeenAt ? ` · last seen ${formatDate(member.lastSeenAt)}` : ''}
                  </Text>
                </div>

                {weeks !== null && (
                  <Badge variant={weeks >= 8 ? 'danger' : 'warning'} size="sm" className="shrink-0">
                    {weeks}w
                  </Badge>
                )}
              </div>

              <div className="flex gap-1 border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                <Button variant="ghost" size="sm" leftIcon={Phone} className="flex-1">
                  Call
                </Button>
                <Button variant="ghost" size="sm" leftIcon={MessageCircle} className="flex-1">
                  WhatsApp
                </Button>
                <Button variant="ghost" size="sm" leftIcon={Mail} className="flex-1">
                  Email
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
