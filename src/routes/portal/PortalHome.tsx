/**
 * @file PortalHome.tsx
 * @description Main dashboard for the Member Portal.
 */
import { Link } from 'react-router-dom';
import { Heart, CalendarDays, Users, Info, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { getGreeting, formatCurrency, formatDateTime } from '@/lib/formatters';
import { MOCK_PORTAL_EVENTS } from '@/mocks/events.mock'; // In real app, fetch via service
import { Button, Card, Text, Avatar } from '@/components/ui';

// Mock data for giving summary
const givingSummary = {
  ytd: 3850,
  lastDonation: { amount: 150, date: '2024-10-20', fund: 'General Fund' }
};

export function PortalHome() {
  const user = useCurrentUser();
  const greeting = getGreeting();

  // In a real app we'd fetch this via react-query and a service
  const events = MOCK_PORTAL_EVENTS.slice(0, 3);

  return (
    <div className="w-full animate-fade-in flex flex-col min-h-full pb-8">
      {/* Welcome Header */}
      <div className="bg-primary pt-safe pb-8 px-4 text-white rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mt-4 mb-6">
          <div>
            <Text variant="caption" className="opacity-80 block mb-1">{greeting}</Text>
            <Text variant="h2">{user?.firstName}</Text>
          </div>
          <Link to="/portal/profile">
            <Avatar 
              name={`${user?.firstName} ${user?.lastName}`} 
              src={user?.photoUrl} 
              size="lg"
              className="border-2 border-primary-light/30 shadow-sm"
            />
          </Link>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={Heart} label="Give" to="/portal/giving" />
          <QuickAction icon={CalendarDays} label="Events" to="/portal/events" />
          <QuickAction icon={Info} label="Notices" to="/portal/announcements" />
          <QuickAction icon={Users} label="Profile" to="/portal/profile" />
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        
        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Text variant="h3">Upcoming Events</Text>
            <Link to="/portal/events">
              <Text variant="body-sm" color="primary" className="font-bold">View All</Text>
            </Link>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 -mx-4 px-4 snap-x">
            {events.map(event => (
              <Card key={event.id} padding="md" className="min-w-[280px] snap-center shrink-0 flex flex-col">
                <Text variant="label" color="primary" className="mb-2">
                  {formatDateTime(event.startDateTime)}
                </Text>
                <Text variant="h3" className="mb-1 line-clamp-1">{event.title}</Text>
                <Text variant="body-sm" color="muted" className="mb-4 flex-1 line-clamp-2">
                  {event.location}
                </Text>
                <Link to={`/portal/events/${event.id}`}>
                  <Button variant="secondary" size="sm" fullWidth>Details</Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* Giving Summary */}
        <section>
          <Text variant="h3" className="mb-3">My Giving</Text>
          <Card padding="md">
            <div className="flex items-end justify-between mb-4">
              <div>
                <Text variant="body-sm" color="muted">Year to Date</Text>
                <Text variant="display" color="primary">{formatCurrency(givingSummary.ytd)}</Text>
              </div>
              <Link to="/portal/giving">
                <Button variant="primary" size="sm">Give Now</Button>
              </Link>
            </div>
            
            <hr className="border-slate-100 dark:border-slate-800 my-4" />
            
            <Link to="/portal/giving" className="flex items-center justify-between group">
              <div>
                <Text variant="body-sm" className="font-medium">Latest: {givingSummary.lastDonation.fund}</Text>
                <Text variant="caption" color="muted">
                  {formatCurrency(givingSummary.lastDonation.amount)} • {new Date(givingSummary.lastDonation.date).toLocaleDateString()}
                </Text>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
            </Link>
          </Card>
        </section>

      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }: { icon: any, label: string, to: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 group">
      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition-colors shadow-sm">
        <Icon size={24} className="text-white" />
      </div>
      <Text variant="caption" className="text-white font-medium tracking-wide">{label}</Text>
    </Link>
  );
}
