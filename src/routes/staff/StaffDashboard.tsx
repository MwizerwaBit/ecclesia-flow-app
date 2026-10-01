/**
 * @file StaffDashboard.tsx
 * @description Main dashboard for church staff, showing key metrics and quick actions.
 */
import { Users, CalendarDays, Banknote, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Text, Button } from '@/components/ui';

export function StaffDashboard() {
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
          value="1,248" 
          trend="+12 this month" 
          trendPositive={true}
          icon={Users}
          color="bg-primary-light/20 text-primary"
        />
        <StatCard 
          title="Last Sunday Attendance" 
          value="842" 
          trend="-3% vs previous" 
          trendPositive={false}
          icon={CalendarDays}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <StatCard 
          title="MTD Giving" 
          value="$42,500" 
          trend="+15% vs last month" 
          trendPositive={true}
          icon={Banknote}
          color="bg-success-light/30 text-success"
        />
        <StatCard 
          title="Active Volunteers" 
          value="156" 
          trend="Stable" 
          trendPositive={true}
          icon={TrendingUp}
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
          <Link to="/staff/members/new">
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
            <Button variant="secondary" size="sm">View All</Button>
          </div>
          
          <div className="space-y-4">
            <ActionItem 
              title="First-time Visitor Follow-up" 
              description="5 visitors from last Sunday haven't received a welcome call."
              urgency="high"
            />
            <ActionItem 
              title="Pending Background Checks" 
              description="3 volunteers for Youth Ministry need background checks approved."
              urgency="medium"
            />
            <ActionItem 
              title="Draft Announcement" 
              description="'Christmas Service Times' is saved as a draft and needs review."
              urgency="low"
            />
          </div>
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
  const urgencyColors = {
    high: 'border-l-danger bg-danger-light/10',
    medium: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
    low: 'border-l-primary bg-primary-light/10',
  };

  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${urgencyColors[urgency]} flex justify-between items-center group cursor-pointer`}>
      <div>
        <Text variant="body" className="font-bold mb-1">{title}</Text>
        <Text variant="body-sm" color="muted">{description}</Text>
      </div>
      <ArrowRight size={20} className="text-slate-400 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
    </div>
  );
}
