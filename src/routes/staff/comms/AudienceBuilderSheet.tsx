/**
 * @file AudienceBuilderSheet.tsx
 * @description "Who should receive this?" — with the count updating as you choose.
 *
 * The live recipient count is the entire point. Sending to nobody, or to the whole
 * church when you meant the choir, is the mistake this screen exists to catch, so
 * the number is shown large and refreshes on every change.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import type { AudienceFilter, MemberStatus } from '@/types';
import { commsService } from '@/services/commsService';
import { BottomSheet, Button, Checkbox, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

interface AudienceBuilderSheetProps {
  onClose: () => void;
  /** Seeds the initial selection. The parent mounts this only while the sheet is
   *  open, so closing discards edits without any state to reset. */
  filter: AudienceFilter;
  onApply: (filter: AudienceFilter, estimatedCount: number) => void;
}

const STATUS_OPTIONS: Array<{ value: MemberStatus; label: string }> = [
  { value: 'active', label: 'Members' },
  { value: 'visitor', label: 'Visitors' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'inactive', label: 'Inactive' },
];

export function AudienceBuilderSheet({ onClose, filter, onApply }: AudienceBuilderSheetProps) {
  const [unitIds, setUnitIds] = useState<string[]>(filter.unitIds ?? []);
  const [statuses, setStatuses] = useState<string[]>(filter.statuses ?? []);

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const { data: estimate = 0, isFetching } = useQuery({
    queryKey: ['audience-estimate', unitIds, statuses],
    queryFn: () => commsService.estimateAudience({ unitIds, statuses }),
  });

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Who should receive this?"
      description="Leave everything unticked to reach the whole congregation."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => {
            onApply({ unitIds, statuses, estimatedCount: estimate }, estimate);
            onClose();
          }}
        >
          Use this audience
        </Button>
      }
    >
      {/* Live count — the whole reason this sheet exists */}
      <div className="flex items-center gap-3 rounded-xl bg-primary-light dark:bg-primary/15 px-4 py-3 mb-5">
        <Users size={22} className="text-primary shrink-0" aria-hidden />
        <div>
          <Text variant="label" className="text-primary">
            Recipients
          </Text>
          <p
            className={cn(
              'font-sans text-h2 font-semibold tabular-nums text-primary transition-opacity',
              isFetching && 'opacity-50',
            )}
          >
            {estimate}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Text variant="label" color="muted" className="mb-2 block">
            Groups
          </Text>
          <div className="space-y-1">
            {units.map((unit) => (
              <Checkbox
                key={unit.id}
                label={`${unit.name} (${unit.memberCount})`}
                checked={unitIds.includes(unit.id)}
                onChange={() => toggle(unitIds, setUnitIds, unit.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <Text variant="label" color="muted" className="mb-2 block">
            Status
          </Text>
          <div className="space-y-1">
            {STATUS_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={statuses.includes(option.value)}
                onChange={() => toggle(statuses, setStatuses, option.value)}
              />
            ))}
          </div>
        </div>

        {(unitIds.length > 0 || statuses.length > 0) && (
          <Button
            variant="ghost"
            fullWidth
            size="sm"
            onClick={() => {
              setUnitIds([]);
              setStatuses([]);
            }}
          >
            Clear and reach everyone
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
