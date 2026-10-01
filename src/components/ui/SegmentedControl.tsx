/**
 * @file SegmentedControl.tsx
 * @description iOS-style segmented toggle for switching between two or three modes
 * (member search vs envelope number, list vs calendar, weekly vs monthly).
 *
 * Preferred over a <Select> when there are few options and the choice changes
 * what is on screen immediately.
 *
 * @example
 * <SegmentedControl
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value: 'member_search', label: 'Member' },
 *     { value: 'envelope', label: 'Envelope #' },
 *   ]}
 * />
 */
import { cn } from '@/lib/cn';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Accessible group name, e.g. "Donation entry mode". */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex w-full items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1',
        size === 'sm' ? 'h-10' : 'h-12',
        className
      )}
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
              'flex-1 h-full rounded-lg px-3 font-medium transition-all duration-fast',
              size === 'sm' ? 'text-body-sm' : 'text-body',
              isActive
                ? 'bg-surface dark:bg-slate-700 text-primary shadow-card'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
