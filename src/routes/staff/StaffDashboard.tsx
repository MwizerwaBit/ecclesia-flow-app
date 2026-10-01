/**
 * @file StaffDashboard.tsx
 * @description Main dashboard for church staff, showing key metrics and quick actions.
 */
import { Users, CalendarDays, Banknote, CalendarClock, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, Button, EmptyState } from '@/components/ui';
import { membersService } from '@/services/membersService';
import { eventsService } from '@/services/eventsService';
import { financeService } from '@/services/financeService';
import { commsService } from '@/services/commsService';
import { formatCurrencyCompact, formatNumber, formatPercent } from '@/lib/formatters';

export function StaffDashboard() {
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'roster'],
    queryFn: () => membersService.list(),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => eventsService.list(),
  });
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventsService.list({ upcoming: true }),
  });
  const { data: finance } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => financeService.getDashboard(),
  });
  const { data: followUps = [] } = useQuery({
    queryKey: ['members', 'visitor-followups'],
    queryFn: () => membersService.getVisitorFollowUps(),
  });
  const { data: draftAnnouncements = [] } = useQuery({
    queryKey: ['announcements', 'draft'],
    queryFn: () => commsService.listAnnouncements({ status: 'draft' }),
  });

  const activeCount = members.filter((m) => m.status === 'active').length;
  const visitorCount = members.filter((m) => m.status === 'visitor').length;

  const completedServices = events
    .filter((e) => e.type === 'service' && e.status === 'completed')
    .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
  const lastService = completedServices[0];
  const priorService = completedServices[1];
  const attendanceTrend =
    lastService?.attendeeCount != null && priorService?.attendeeCount
      ? (lastService.attendeeCount - priorService.attendeeCount) / priorService.attendeeCount
      : null;

  const openBatchCount = finance?.openBatchCount ?? 0;

  const needsAttention = [
    followUps.length > 0 && {
      key: 'followups',
      title: 'First-time visitor follow-up',
      description: `${followUps.length} visitor${followUps.length === 1 ? '' : 's'} ${followUps.length === 1 ? 'hasn\'t' : 'haven\'t'} been followed up with yet.`,
      urgency: 'high' as const,
      href: '/staff/members/visitor-followup',
    },
    openBatchCount > 0 && {
      key: 'batches',
      title: 'Open offering batches',
      description: `${openBatchCount} batch${openBatchCount === 1 ? '' : 'es'} still open and waiting to be reviewed and closed.`,
      urgency: 'medium' as const,
      href: '/staff/finance/batches',
    },
    draftAnnouncements.length > 0 && {
      key: 'drafts',
      title: 'Draft announcement',
      description: `'${draftAnnouncements[0].title}'${draftAnnouncements.length > 1 ? ` and ${draftAnnouncements.length - 1} more` : ''} saved as a draft and needs review.`,
      urgency: 'low' as const,
      href: '/staff/comms/announcements',
    },
  ].filter(Boolean) as Array<{ key: string; title: string; description: string; urgency: 'high' | 'medium' | 'low'; href: string }>;

  return (
    <div className="w-full animate-fade-in p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Text variant="h1" className="mb-1">Staff Dashboard</Text>
        <Text variant="body" color="muted">Overview of your church's health and activity today.</Text>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={formatNumber(members.length)}
          trend={`${formatNumber(activeCount)} active · ${formatNumber(visitorCount)} visitors`}
          trendPositive={true}
          icon={Users}
          color="bg-primary-light/20 text-primary"
        />
        <StatCard
          title="Last Sunday Attendance"
          value={lastService?.attendeeCount != null ? formatNumber(lastService.attendeeCount) : '—'}
          trend={attendanceTrend != null ? `${attendanceTrend >= 0 ? '+' : ''}${formatPercent(attendanceTrend, 0)} vs previous` : 'No prior service to compare'}
          trendPositive={attendanceTrend == null ? true : attendanceTrend >= 0}
          icon={CalendarDays}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <StatCard
          title="This Week's Giving"
          value={finance ? formatCurrencyCompact(finance.thisWeekTotal) : '—'}
          trend={
            finance
              ? `${finance.thisWeekTotal >= finance.lastWeekTotal ? '+' : ''}${formatPercent((finance.thisWeekTotal - finance.lastWeekTotal) / finance.lastWeekTotal, 0)} vs last week`
              : 'Loading…'
          }
          trendPositive={finance ? finance.thisWeekTotal >= finance.lastWeekTotal : true}
          icon={Banknote}
          color="bg-success-light/30 text-success"
        />
        <StatCard
          title="Upcoming Events"
          value={formatNumber(upcomingEvents.length)}
          trend="Scheduled from today"
          trendPositive={true}
          icon={CalendarClock}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <Card padding="lg" className="lg:col-span-1 flex flex-col gap-3">
          <Text variant="h3" className="mb-2">Quick Actions</Text>
          <Link to="/staff/members/visitor-followup">
            <Button variant="secondary" fullWidth className="justify-start">Visitor follow-ups</Button>
          </Link>
          <Link to="/staff/members/not-seen">
            <Button variant="secondary" fullWidth className="justify-start">Not seen recently</Button>
          </Link>
          <Link to="/staff/attendance/take">
            <Button variant="secondary" fullWidth className="justify-start">Record Attendance</Button>
          </Link>
          <Link to="/staff/members/add">
            <Button variant="secondary" fullWidth className="justify-start">Add New Member</Button>
          </Link>
          <Link to="/staff/finance/batches">
            <Button variant="secondary" fullWidth className="justify-start">Process Batch Donations</Button>
          </Link>
          <Link to="/staff/comms/announcements/new">
            <Button variant="secondary" fullWidth className="justify-start">Send Announcement</Button>
          </Link>
        </Card>

        {/* Recent Activity / Action Items */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <Text variant="h3">Needs Attention</Text>
          </div>

          {needsAttention.length > 0 ? (
            <div className="space-y-4">
              {needsAttention.map((item) => (
                <Link key={item.key} to={item.href}>
                  <ActionItem title={item.title} description={item.description} urgency={item.urgency} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="All caught up"
              description="No visitor follow-ups, open batches, or draft announcements need attention right now."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendPositive, icon: Icon, color }: any) {
  return (
    <Card padding="lg" className="flex flex-col border-none shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <Text variant="caption" color="muted" className="font-bold uppercase tracking-wider mb-1">{title}</Text>
        <Text variant="display" className="text-3xl mb-1">{value}</Text>
        <Text variant="caption" className={trendPositive ? 'text-success' : 'text-danger'}>
          {trend}
        </Text>
      </div>
    </Card>
  );
}

function ActionItem({ title, description, urgency }: { title: string, description: string, urgency: 'high' | 'medium' | 'low' }) {
  const accentByUrgency = { high: 'danger', medium: 'warning', low: 'primary' } as const;

  return (
    <Card accent={accentByUrgency[urgency]} padding="md" className="flex justify-between items-center group cursor-pointer">
      <div>
        <Text variant="body" className="font-bold mb-1">{title}</Text>
        <Text variant="body-sm" color="muted">{description}</Text>
      </div>
      <ArrowRight size={20} className="text-slate-400 group-hover:text-primary transition-colors transform group-hover:translate-x-1 shrink-0 ml-4" />
    </Card>
  );
}
