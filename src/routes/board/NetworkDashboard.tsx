/**
 * @file NetworkDashboard.tsx
 * @description The diocese view — every parish rolled up, with a level selector.
 *
 * A network leader's question is comparative, not absolute: which parishes are
 * growing and which are struggling. So totals are shown once at the top, and the
 * rest of the screen is the comparison.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Banknote, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { Card, SegmentedControl, StatTile, Text } from '@/components/ui';
import { formatCurrencyCompact, formatNumber, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Level = 'all' | 'region' | 'parish';

/** Per-parish comparison figures — the shape a rollup endpoint returns. */
const PARISH_STATS = [
  { id: 'p1', name: 'St. Jude Central', members: 248, attendanceRate: 0.91, giving: 142500, change: 0.08 },
  { id: 'p2', name: 'St. Mary Northside', members: 186, attendanceRate: 0.78, giving: 98200, change: 0.03 },
  { id: 'p3', name: 'Holy Cross East', members: 312, attendanceRate: 0.84, giving: 176400, change: -0.05 },
  { id: 'p4', name: 'St. Peter Riverside', members: 94, attendanceRate: 0.62, giving: 41800, change: -0.12 },
  { id: 'p5', name: 'St. Anne Westgate', members: 205, attendanceRate: 0.88, giving: 121300, change: 0.15 },
];

export function NetworkDashboard() {
  const [level, setLevel] = useState<Level>('all');

  const { data: metrics } = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: () => platformService.getMetrics(),
  });

  const totals = useMemo(
    () => ({
      members: PARISH_STATS.reduce((sum, p) => sum + p.members, 0),
      giving: PARISH_STATS.reduce((sum, p) => sum + p.giving, 0),
      attendance:
        PARISH_STATS.reduce((sum, p) => sum + p.attendanceRate, 0) / PARISH_STATS.length,
    }),
    [],
  );

  // Weakest first — this screen exists to find the parishes needing support.
  const ranked = [...PARISH_STATS].sort((a, b) => a.attendanceRate - b.attendanceRate);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <header>
        <Text variant="h1" className="mb-1">
          Network
        </Text>
        <Text variant="body" color="muted">
          {PARISH_STATS.length} parishes · {formatNumber(totals.members)} members
        </Text>
      </header>

      <SegmentedControl
        label="Rollup level"
        value={level}
        onChange={setLevel}
        options={[
          { value: 'all', label: 'Whole network' },
          { value: 'region', label: 'By region' },
          { value: 'parish', label: 'By parish' },
        ]}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Members" value={formatNumber(totals.members)} icon={Users} />
        <StatTile label="Giving YTD" value={formatCurrencyCompact(totals.giving)} icon={Banknote} />
        <StatTile label="Attendance" value={formatPercent(totals.attendance, 0)} />
      </div>

      {metrics && (
        <Card variant="flat" padding="md" className="flex items-center justify-between">
          <div>
            <Text variant="label" color="muted">
              Across the platform
            </Text>
            <Text variant="body-sm" color="muted">
              {metrics.activeOrgs} active organisations
            </Text>
          </div>
          <Text variant="h3" className="tabular-nums">
            {formatNumber(metrics.totalMembers)}
          </Text>
        </Card>
      )}

      {/* Comparison */}
      <div>
        <Text variant="h2" className="mb-1">
          Parish comparison
        </Text>
        <Text variant="body-sm" color="muted" className="mb-3">
          Sorted by attendance rate — those needing support first.
        </Text>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800">
          {ranked.map((parish) => {
            const isStruggling = parish.attendanceRate < 0.7;

            return (
              <Link
                key={parish.id}
                to={`/board/organisations/${parish.id}`}
                className="block px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <Text variant="h3" className="truncate">
                      {parish.name}
                    </Text>
                    <Text variant="caption" color="muted">
                      {parish.members} members · {formatCurrencyCompact(parish.giving)} YTD
                    </Text>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1 shrink-0',
                      parish.change >= 0 ? 'text-success' : 'text-danger',
                    )}
                  >
                    {parish.change >= 0 ? (
                      <TrendingUp size={14} aria-hidden />
                    ) : (
                      <TrendingDown size={14} aria-hidden />
                    )}
                    <span className="text-caption font-medium tabular-nums">
                      {formatPercent(Math.abs(parish.change), 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-slow',
                        isStruggling ? 'bg-warning' : 'bg-primary',
                      )}
                      style={{ width: `${parish.attendanceRate * 100}%` }}
                    />
                  </div>
                  <Text variant="caption" color="muted" className="tabular-nums shrink-0">
                    {formatPercent(parish.attendanceRate, 0)}
                  </Text>
                </div>
              </Link>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
