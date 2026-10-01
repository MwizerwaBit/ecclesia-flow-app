/**
 * @file StatTile.tsx
 * @description A single headline figure with its label — the unit dashboards are built from.
 *
 * Progressive disclosure: the tile carries the summary, the screen it links to carries the detail.
 *
 * @example
 * <StatTile
 *   label="This week's giving"
 *   value={formatCurrency(4250)}
 *   trend={{ direction: 'down', label: '17% vs last week' }}
 * />
 */
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';
import { Text } from './Typography';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { direction: 'up' | 'down'; label: string };
  /** Reads a downward trend as good (e.g. absences falling). Default false. */
  invertTrendColor?: boolean;
  className?: string;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  invertTrendColor = false,
  className,
}: StatTileProps) {
  const isPositive = trend ? (trend.direction === 'up') !== invertTrendColor : false;
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card variant="elevated" padding="sm" className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start justify-between gap-2">
        <Text variant="label" color="muted">
          {label}
        </Text>
        {Icon && (
          <Icon size={16} className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden />
        )}
      </div>

      <Text variant="number" className="tabular-nums">
        {value}
      </Text>

      {trend && (
        <div className={cn('flex items-center gap-1', isPositive ? 'text-success' : 'text-danger')}>
          <TrendIcon size={14} aria-hidden />
          <span className="text-caption font-medium">{trend.label}</span>
        </div>
      )}

      {hint && !trend && (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      )}
    </Card>
  );
}
