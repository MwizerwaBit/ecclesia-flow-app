/**
 * @file CustomRoleBuilder.tsx
 * @description Assemble a role from the permission catalogue.
 *
 * Permissions are grouped by module and each group can be granted wholesale,
 * because the common case is "everything in Giving". Sensitive permissions are
 * marked inline rather than collected into a warning at the end — the moment to
 * think twice is when the box is being ticked.
 */
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, ShieldAlert } from 'lucide-react';
import { teamService } from '@/services/teamService';
import { PERMISSION_CATALOGUE } from '@/mocks/comms.mock';
import { useRole } from '@/hooks/useRole';
import { Button, Card, Checkbox, Input, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Badge colours drawn from the design system rather than a free colour picker. */
const ROLE_COLORS = [
  { value: '#4338CA', name: 'Indigo' },
  { value: '#B45309', name: 'Gold' },
  { value: '#16A34A', name: 'Green' },
  { value: '#0284C7', name: 'Sky' },
  { value: '#DC2626', name: 'Red' },
  { value: '#7C3AED', name: 'Violet' },
];

export function CustomRoleBuilder() {
  const { can } = useRole();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0].value);
  const [granted, setGranted] = useState<Set<string>>(new Set());

  const sensitiveCount = useMemo(
    () =>
      PERMISSION_CATALOGUE.flatMap((g) => g.permissions).filter(
        (p) => p.sensitive && granted.has(p.key),
      ).length,
    [granted],
  );

  const createRole = useMutation({
    mutationFn: () =>
      teamService.createRole({ name: name.trim(), color, permissions: [...granted] }),
    onSuccess: () => navigate('/staff/team'),
  });

  if (!can('roles:create')) {
    return <Navigate to="/403" replace />;
  }

  function toggle(key: string) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleModule(keys: string[], allGranted: boolean) {
    setGranted((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => (allGranted ? next.delete(key) : next.add(key)));
      return next;
    });
  }

  const canSave = name.trim().length > 0 && granted.size > 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Build a role
        </Text>
        <Text variant="body" color="muted">
          Pick exactly what this role can reach — nothing more.
        </Text>
      </header>

      <Input
        label="Role name"
        autoFocus
        placeholder="Youth Leader"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div>
        <Text variant="label" color="muted" className="mb-2 block">
          Badge colour
        </Text>
        <div className="flex gap-2">
          {ROLE_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              aria-label={option.name}
              aria-pressed={color === option.value}
              className={cn(
                'size-10 rounded-full transition-transform flex items-center justify-center',
                color === option.value
                  ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-background-dark'
                  : 'hover:scale-105',
              )}
              style={{ backgroundColor: option.value }}
            >
              {color === option.value && (
                <Check size={16} className="text-white" strokeWidth={3} aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview of the badge as it will appear on the team list */}
      <Card variant="flat" padding="md" className="flex items-center justify-between">
        <Text variant="body-sm" color="muted">
          Preview
        </Text>
        <span
          className="rounded-full px-3 py-1 text-caption font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {name.trim() || 'Role name'}
        </span>
      </Card>

      {/* Permission catalogue */}
      <div className="space-y-3">
        {PERMISSION_CATALOGUE.map((group) => {
          const keys = group.permissions.map((p) => p.key);
          const allGranted = keys.every((key) => granted.has(key));
          const someGranted = keys.some((key) => granted.has(key));

          return (
            <Card key={group.module} padding="md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <Text variant="h3">{group.module}</Text>
                  <Text variant="caption" color="muted">
                    {group.description}
                  </Text>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="shrink-0"
                  onClick={() => toggleModule(keys, allGranted)}
                >
                  {allGranted ? 'None' : 'All'}
                </Button>
              </div>

              <div className="space-y-2">
                {group.permissions.map((permission) => (
                  <Checkbox
                    key={permission.key}
                    checked={granted.has(permission.key)}
                    onChange={() => toggle(permission.key)}
                    label={
                      <span className="flex items-center gap-1.5">
                        {permission.label}
                        {permission.sensitive && (
                          <ShieldAlert
                            size={13}
                            className="text-warning"
                            aria-label="Sensitive permission"
                          />
                        )}
                      </span>
                    }
                  />
                ))}
              </div>

              {someGranted && !allGranted && (
                <Text variant="caption" color="muted" className="block mt-2">
                  {keys.filter((k) => granted.has(k)).length} of {keys.length} granted
                </Text>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card variant="outline" padding="md" className="space-y-1">
        <div className="flex justify-between">
          <Text variant="body-sm" color="muted">
            Permissions granted
          </Text>
          <Text variant="body-sm" className="font-medium tabular-nums">
            {granted.size}
          </Text>
        </div>
        {sensitiveCount > 0 && (
          <div className="flex justify-between">
            <Text variant="body-sm" className="text-warning">
              Of which sensitive
            </Text>
            <Text variant="body-sm" className="text-warning font-medium tabular-nums">
              {sensitiveCount}
            </Text>
          </div>
        )}
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!canSave}
        isLoading={createRole.isPending}
        onClick={() => createRole.mutate()}
      >
        Create role
      </Button>

      <Button variant="ghost" fullWidth onClick={() => navigate('/staff/team')}>
        Cancel
      </Button>
    </div>
  );
}
