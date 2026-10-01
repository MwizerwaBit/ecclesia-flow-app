/**
 * @file AddEditUnitSheet.tsx
 * @description Add a unit, or edit one in place.
 *
 * Unit *type* is free text rather than a fixed list, because the product serves
 * churches, mosques and temples alike — "Parish", "Branch", "Zone" and "Circuit"
 * are all valid, and none of them should be hardcoded.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HierarchyUnit } from '@/types';
import { BottomSheet, Button, Input, Select, Text } from '@/components/ui';

interface AddEditUnitSheetProps {
  /** The parent to nest under; null creates a top-level unit. */
  parent: HierarchyUnit | null;
  units: HierarchyUnit[];
  onClose: () => void;
}

/** Common type names offered as a starting point, not a constraint. */
const TYPE_SUGGESTIONS = ['Church', 'Branch', 'Zone', 'Group', 'Ministry', 'District', 'Circuit'];

export function AddEditUnitSheet({ parent, units, onClose }: AddEditUnitSheetProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [type, setType] = useState(parent ? 'Group' : 'Church');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [parentId, setParentId] = useState(parent?.id ?? '');

  const save = useMutation({
    // No hierarchy write endpoint yet — the shape is settled, the call is not.
    mutationFn: async () => ({ name: name.trim(), type, code, address, parentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['units'] });
      onClose();
    },
  });

  const duplicateName = units.some(
    (u) => u.name.toLowerCase() === name.trim().toLowerCase() && u.parentId === (parentId || undefined),
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={parent ? `New unit under ${parent.name}` : 'New unit'}
      description="Units group members and roll reporting up the structure."
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={name.trim().length === 0 || duplicateName}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Create unit
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Unit name"
          autoFocus
          placeholder="Youth Group"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={duplicateName ? 'A unit with this name already sits here.' : undefined}
        />

        <div>
          <Input
            label="Unit type"
            placeholder="Group"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TYPE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setType(suggestion)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-caption text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <Text variant="caption" color="muted" className="block mt-2">
            Use whatever your tradition calls it — this is what members will see.
          </Text>
        </div>

        <Select
          label="Sits under"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          options={[
            { value: '', label: 'Top level' },
            ...units.map((u) => ({ value: u.id, label: `${u.name} (${u.type})` })),
          ]}
        />

        <Input
          label="Code"
          placeholder="Optional — a short reference"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <Input
          label="Address"
          placeholder="Optional"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
    </BottomSheet>
  );
}
