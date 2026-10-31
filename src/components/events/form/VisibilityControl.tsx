/**
 * @file VisibilityControl.tsx
 * @description Who can see a gathering (Public, Members or Group only) and which group it belongs to.
 *
 * Visibility is separate from publishing: a gathering is saved as a draft first,
 * and visibility says who sees it once it is published. A "Group only" gathering
 * must name its group, and the API refuses one without, so the rule is shown
 * here before anyone saves.
 */
import type { EventVisibility } from '@/types';
import { EVENT_VISIBILITY_HELP, EVENT_VISIBILITY_LABEL } from '@/lib/events';
import { SegmentedControl, Select, Text, type SelectOption } from '@/components/ui';

const VISIBILITIES: EventVisibility[] = ['public', 'members', 'private'];

interface VisibilityControlProps {
  visibility: EventVisibility;
  groupId: string;
  groups: SelectOption[];
  onVisibilityChange: (visibility: EventVisibility) => void;
  onGroupChange: (groupId: string) => void;
  /** Spread onto the group select: its error and blur/input handling. */
  groupField: { error?: string; onBlur: () => void; onInput: () => void };
}

export function VisibilityControl({
  visibility,
  groupId,
  groups,
  onVisibilityChange,
  onGroupChange,
  groupField,
}: VisibilityControlProps) {
  const isPrivate = visibility === 'private';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Text variant="label" className="block text-slate-700 dark:text-slate-300">
          Who can see it
        </Text>
        <SegmentedControl
          label="Who can see this gathering"
          value={visibility}
          onChange={onVisibilityChange}
          options={VISIBILITIES.map((v) => ({ value: v, label: EVENT_VISIBILITY_LABEL[v] }))}
        />
        <Text variant="caption" color="muted" className="block" aria-live="polite">
          {EVENT_VISIBILITY_HELP[visibility]}
          {isPrivate && ' Choose the group below.'} It applies once the gathering is published.
        </Text>
      </div>

      <Select
        label={isPrivate ? 'Group (required)' : 'Group (optional)'}
        value={groupId}
        onChange={(e) => onGroupChange(e.target.value)}
        options={[{ value: '', label: isPrivate ? 'Choose a group' : 'Not tied to a group' }, ...groups]}
        required={isPrivate}
        {...groupField}
      />
    </div>
  );
}
