/**
 * @file FilterChips.tsx
 * @description A horizontally scrollable row of filter chips.
 *
 * Use this instead of <SegmentedControl> once there are more than three options:
 * a segmented control divides the full width between its segments, so at 390px
 * four or more segments either overflow the viewport or become unreadably narrow.
 * Chips scroll instead, and each keeps a 44px touch target.
 *
 * @example
 * <FilterChips value={filter} onChange={setFilter} options={[
 *   { value: 'all', label: 'All' },
 *   { value: 'active', label: 'Members' },
 * ]} />
 */
import { cn } from '@/lib/cn';

interface FilterChipsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Accessible group name, e.g. "Filter members by status". */
  label?: string;
  className?: string;
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      // Negative margin lets the first and last chip sit flush with the page
      // gutter while still scrolling edge to edge.
      className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 h-11 rounded-full px-4 text-body-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
