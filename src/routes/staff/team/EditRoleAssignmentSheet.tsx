/**
 * @file EditRoleAssignmentSheet.tsx
 * @description Change what one team member can do, and where.
 *
 * Role and unit scope are edited together because they only mean something in
 * combination: "Treasurer" across all units and "Treasurer" for one branch are
 * very different grants, and separating them invites the wrong one.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import type { CustomRole, TeamMember } from '@/types';
import { teamService } from '@/services/teamService';
import { commsService } from '@/services/commsService';
import { BottomSheet, Button, Card, Input, Select, Text } from '@/components/ui';

interface EditRoleAssignmentSheetProps {
  /** The member being edited. The parent mounts this only while a member is
   *  selected, so each open starts from that member's current assignment. */
  member: TeamMember;
  roles: CustomRole[];
  onClose: () => void;
}

export function EditRoleAssignmentSheet({ member, roles, onClose }: EditRoleAssignmentSheetProps) {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState(member.roleId);
  const [unitScope, setUnitScope] = useState(member.unitScope ?? 'all');
  const [expiresAt, setExpiresAt] = useState('');

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => commsService.listUnits(),
  });

  const save = useMutation({
    mutationFn: () => teamService.updateAssignment(member.id, { roleId, unitScope }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      onClose();
    },
  });

  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`${member.firstName} ${member.lastName}`}
      description={member.email}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save assignment
        </Button>
      }
    >
      <div className="space-y-4">
        <Select
          label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
        />

        <Select
          label="Unit scope"
          value={unitScope}
          onChange={(e) => setUnitScope(e.target.value)}
          options={[
            { value: 'all', label: 'All units' },
            ...units.map((u) => ({ value: u.id, label: u.name })),
          ]}
        />

        <Input
          label="Access expires"
          type="date"
          placeholder="Optional"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <Text variant="caption" color="muted">
          Useful for a short-term volunteer — access lapses without anyone remembering to remove it.
        </Text>

        {/* What this grant actually means, in plain terms */}
        {selectedRole && (
          <Card variant="flat" padding="md">
            <Text variant="label" color="muted" className="mb-2 block">
              What they will be able to do
            </Text>
            <Text variant="body-sm">
              {selectedRole.permissions.length} permissions across{' '}
              {unitScope === 'all'
                ? 'every unit'
                : (units.find((u) => u.id === unitScope)?.name ?? 'one unit')}
              .
            </Text>

            {selectedRole.permissions.some((p) => p.startsWith('finance:')) && (
              <div className="flex items-start gap-2 mt-3">
                <ShieldAlert size={16} className="text-warning shrink-0 mt-0.5" aria-hidden />
                <Text variant="caption" className="text-warning">
                  This role can see giving records. Two-factor authentication is strongly advised.
                </Text>
              </div>
            )}

            {selectedRole.permissions.some((p) => p.startsWith('pastoral_notes:')) && (
              <div className="flex items-start gap-2 mt-2">
                <ShieldAlert size={16} className="text-warning shrink-0 mt-0.5" aria-hidden />
                <Text variant="caption" className="text-warning">
                  This role can read confidential pastoral notes.
                </Text>
              </div>
            )}
          </Card>
        )}
      </div>
    </BottomSheet>
  );
}
