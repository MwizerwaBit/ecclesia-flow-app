/**
 * @file CalendarFilterBar.tsx
 * @description Filters for a calendar: event type as chips, and group, unit and
 * status as dropdowns. The parent owns the options, so each screen offers only
 * what its viewer may use (members get type and group; staff add unit and status).
 *
 * Named CalendarFilterBar (not CalendarFilters) so it does not collide with the
 * CalendarFilters type from '@/types'.
 *
 * Props contract
 *   value          CalendarFilters       the current filters (from useCalendarWindow)
 *   onChange       (key, value | undefined) => void   one filter changed; undefined clears it
 *   onClear        () => void            clear all
 *   typeOptions    Option[]              omit to hide the type chips
 *   groupOptions   Option[]              omit or leave empty to hide the group dropdown
 *   unitOptions    Option[]              omit or leave empty to hide the unit dropdown (staff)
 *   statusOptions  Option[]              omit or leave empty to hide the status dropdown (staff)
 *   Option = { value: string; label: string }. Do not include an "All" entry; the bar adds it.
 */
import { X } from 'lucide-react';
import type { CalendarFilters } from '@/types';
import { Button, FilterChips, Select } from '@/components/ui';

export interface FilterOption {
  value: string;
  label: string;
}

interface CalendarFilterBarProps {
  value: CalendarFilters;
  onChange: (key: keyof CalendarFilters, value: string | undefined) => void;
  onClear: () => void;
  typeOptions?: FilterOption[];
  groupOptions?: FilterOption[];
  unitOptions?: FilterOption[];
  statusOptions?: FilterOption[];
}

export function CalendarFilterBar({
  value,
  onChange,
  onClear,
  typeOptions,
  groupOptions,
  unitOptions,
  statusOptions,
}: CalendarFilterBarProps) {
  const dropdowns: Array<{ key: 'groupId' | 'unitId' | 'status'; label: string; all: string; options?: FilterOption[] }> = [
    { key: 'groupId', label: 'Group', all: 'All groups', options: groupOptions },
    { key: 'unitId', label: 'Branch', all: 'All branches', options: unitOptions },
    { key: 'status', label: 'Status', all: 'Any status', options: statusOptions },
  ];
  const shown = dropdowns.filter((d) => d.options && d.options.length > 0);
  const active = Object.values(value).some(Boolean);

  if (!typeOptions?.length && shown.length === 0) return null;

  return (
    <div className="space-y-3">
      {typeOptions && typeOptions.length > 0 && (
        <FilterChips
          label="Filter by type"
          value={value.type ?? 'all'}
          onChange={(next) => onChange('type', next === 'all' ? undefined : next)}
          options={[{ value: 'all', label: 'All types' }, ...typeOptions]}
        />
      )}

      {(shown.length > 0 || active) && (
        <div className="flex flex-wrap items-end gap-2">
          {shown.length > 0 && (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-3">
              {shown.map(({ key, label, all, options }) => (
                <Select
                  key={key}
                  label={label}
                  hideLabel
                  value={value[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value || undefined)}
                  options={[{ value: '', label: all }, ...(options ?? [])]}
                />
              ))}
            </div>
          )}
          {active && (
            <Button variant="ghost" leftIcon={X} onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
