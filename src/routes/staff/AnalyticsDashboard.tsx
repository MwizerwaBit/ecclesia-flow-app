/**
 * @file AnalyticsDashboard.tsx
 * @description Trends across attendance, giving, growth and visitor conversion.
 *
 * Four questions a leadership meeting actually asks, answered in one screen.
 * Charts are inline SVG for the same reason as the giving reports: these are
 * short series, and a chart library would be the heaviest thing on the page.
 */
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Download, HeartHandshake, TrendingUp, UserPlus, Users } from 'lucide-react';
import { financeService } from '@/services/financeService';
import { useRole } from '@/hooks/useRole';
import { Card, Button, StatTile, Text } from '@/components/ui';
import { formatCurrencyCompact, formatPercent } from '@/lib/formatters';

const ATTENDANCE_12W = [78, 82, 75, 88, 91, 84, 79, 86, 94, 87, 92, 87];
const GIVING_12W = [3.9, 4.2, 3.6, 4.8, 5.1, 4.4, 4.0, 4.6, 5.3, 4.2, 4.9, 4.25];
const MEMBER_GROWTH = [
  { label: 'May', count: 216 },
  { label: 'Jun', count: 223 },
  { label: 'Jul', count: 228 },
  { label: 'Aug', count: 234 },
  { label: 'Sep', count: 241 },
  { label: 'Oct', count: 248 },
];

const VISITOR_FUNNEL = [
  { stage: 'Visited once', count: 84 },
  { stage: 'Returned', count: 47 },
  { stage: 'Joined a group', count: 29 },
  { stage: 'Became a member', count: 18 },
];

/** Renders a short series as an SVG sparkline scaled to its own range. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-20 w-full"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AnalyticsDashboard() {
  const { can } = useRole();
  const { data: dashboard } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => financeService.getDashboard(),
  });

  if (!can('analytics:read')) {
    return <Navigate to="/403" replace />;
  }

  const latestAttendance = ATTENDANCE_12W[ATTENDANCE_12W.length - 1];
  const firstAttendance = ATTENDANCE_12W[0];
  const attendanceChange = (latestAttendance - firstAttendance) / firstAttendance;

  const growth = MEMBER_GROWTH[MEMBER_GROWTH.length - 1].count - MEMBER_GROWTH[0].count;
  const conversion = VISITOR_FUNNEL[VISITOR_FUNNEL.length - 1].count / VISITOR_FUNNEL[0].count;
  const funnelPeak = VISITOR_FUNNEL[0].count;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Analytics
        </Text>
        <Text variant="body" color="muted">
          The last twelve weeks, at a glance.
        </Text>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Average attendance"
          value={String(Math.round(ATTENDANCE_12W.reduce((a, b) => a + b, 0) / ATTENDANCE_12W.length))}
          icon={Users}
          trend={{
            direction: attendanceChange >= 0 ? 'up' : 'down',
            label: `${formatPercent(Math.abs(attendanceChange), 0)} over 12 weeks`,
          }}
        />
        <StatTile
          label="Year to date giving"
          value={formatCurrencyCompact(dashboard?.yearToDateTotal ?? 0)}
          icon={TrendingUp}
        />
        <StatTile
          label="Members gained"
          value={`+${growth}`}
          icon={UserPlus}
          hint="Since May"
        />
        <StatTile
          label="Visitor conversion"
          value={formatPercent(conversion, 0)}
          icon={HeartHandshake}
          hint="Visit to membership"
        />
      </div>

      {/* Attendance */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-1 block">
          Attendance · 12 weeks
        </Text>
        <Sparkline values={ATTENDANCE_12W} label="Attendance over the last twelve weeks" />
        <div className="flex justify-between">
          <Text variant="caption" color="muted">
            12 weeks ago
          </Text>
          <Text variant="caption" color="muted">
            Last Sunday · {latestAttendance}
          </Text>
        </div>
      </Card>

      {/* Giving */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-1 block">
          Weekly giving · 12 weeks
        </Text>
        <Sparkline values={GIVING_12W} label="Weekly giving over the last twelve weeks" />
        <div className="flex justify-between">
          <Text variant="caption" color="muted">
            12 weeks ago
          </Text>
          <Text variant="caption" color="muted">
            This week · {formatCurrencyCompact((GIVING_12W[GIVING_12W.length - 1] ?? 0) * 1000)}
          </Text>
        </div>
      </Card>

      {/* Growth */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          Member growth
        </Text>
        <div className="flex items-end justify-between gap-2 h-32">
          {MEMBER_GROWTH.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <span className="text-caption text-slate-500 tabular-nums">{point.count}</span>
              <div
                className="w-full rounded-t-md bg-primary/80"
                style={{
                  height: `${(point.count / MEMBER_GROWTH[MEMBER_GROWTH.length - 1].count) * 100}%`,
                }}
                role="img"
                aria-label={`${point.label}: ${point.count} members`}
              />
              <span className="text-caption text-slate-400 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Visitor funnel */}
      <Card padding="md">
        <Text variant="label" color="muted" className="mb-4 block">
          Visitor journey · this year
        </Text>
        <div className="space-y-3">
          {VISITOR_FUNNEL.map((stage, index) => (
            <div key={stage.stage}>
              <div className="flex justify-between gap-3 mb-1">
                <Text variant="body-sm" className="truncate">
                  {stage.stage}
                </Text>
                <div className="flex items-baseline gap-2 shrink-0">
                  {index > 0 && (
                    <Text variant="caption" color="muted" className="tabular-nums">
                      {formatPercent(stage.count / VISITOR_FUNNEL[index - 1].count, 0)}
                    </Text>
                  )}
                  <Text variant="body-sm" className="font-medium tabular-nums">
                    {stage.count}
                  </Text>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-slow"
                  style={{ width: `${(stage.count / funnelPeak) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button variant="secondary" fullWidth leftIcon={Download}>
        Export these reports
      </Button>
    </div>
  );
}
