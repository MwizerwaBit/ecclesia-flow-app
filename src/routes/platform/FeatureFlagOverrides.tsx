/**
 * @file FeatureFlagOverrides.tsx
 * @description PA-07 — turn features on or off for one church, regardless of tier.
 *
 * Each flag shows its tier default beside its current value, so an override is
 * always visibly an override. Overrides carry a note and an expiry because the
 * ones that outlive the reason for them are how tier boundaries quietly dissolve.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Flag, RotateCcw } from 'lucide-react';
import type { FeatureFlag } from '@/types';
import { platformService } from '@/services/platformService';
import { Badge, BottomSheet, Button, Card, Input, Text } from '@/components/ui';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export function FeatureFlagOverrides() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const [pending, setPending] = useState<{ flag: FeatureFlag; next: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const { data: org } = useQuery({
    queryKey: ['platform', 'org', id],
    queryFn: () => platformService.getOrg(id),
    enabled: Boolean(id),
  });

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['platform', 'flags', id],
    queryFn: () => platformService.listFeatureFlags(id),
    enabled: Boolean(id),
  });

  // Reverting is the same write as applying — with the tier's own value.
  const revert = useMutation({
    mutationFn: (flag: FeatureFlag) =>
      platformService.setFeatureFlag(id, flag.code, flag.tierDefault, 'Reverted to tier default'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'flags', id] }),
  });

  const apply = useMutation({
    mutationFn: () =>
      platformService.setFeatureFlag(id, pending!.flag.code, pending!.next, note.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'flags', id] });
      setPending(null);
      setNote('');
      setExpiresAt('');
    },
  });

  const overridden = flags.filter((f) => f.isOverridden);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Feature flags
        </Text>
        <Text variant="body" color="muted">
          {org?.displayName ?? 'Loading…'} · {overridden.length} override
          {overridden.length === 1 ? '' : 's'} in place
        </Text>
      </header>

      {isLoading && (
        <Text variant="body" color="muted" className="text-center py-10">
          Loading flags…
        </Text>
      )}

      <div className="space-y-3">
        {flags.map((flag) => (
          <Card
            key={flag.code}
            padding="md"
            variant="elevated"
            className={cn(flag.isOverridden && 'border border-primary/30')}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Text variant="h3" className="truncate">
                    {flag.label}
                  </Text>
                  {flag.isOverridden && (
                    <Badge variant="primary" size="sm" className="shrink-0">
                      Override
                    </Badge>
                  )}
                </div>
                <Text variant="caption" color="muted">
                  {flag.description}
                </Text>
              </div>

              {/* Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={flag.currentValue}
                aria-label={`${flag.label} ${flag.currentValue ? 'on' : 'off'}`}
                onClick={() => setPending({ flag, next: !flag.currentValue })}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-fast',
                  flag.currentValue ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 size-5 rounded-full bg-white transition-transform duration-fast',
                    flag.currentValue ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-3 text-caption text-slate-500">
              <span>
                Tier default:{' '}
                <span className="font-medium">{flag.tierDefault ? 'on' : 'off'}</span>
              </span>
              {flag.isOverridden && (
                <span className="text-primary">
                  Now: <span className="font-medium">{flag.currentValue ? 'on' : 'off'}</span>
                </span>
              )}
            </div>

            {flag.isOverridden && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Text variant="caption" color="muted">
                  {flag.overrideNote}
                  {flag.overrideSetBy ? ` — ${flag.overrideSetBy}` : ''}
                  {flag.overrideSetAt ? `, ${formatDate(flag.overrideSetAt)}` : ''}
                </Text>
                {flag.overrideExpiresAt && (
                  <Text variant="caption" className="text-warning block mt-0.5">
                    Expires {formatDate(flag.overrideExpiresAt)}
                  </Text>
                )}
                <Button
                  variant="link"
                  size="sm"
                  leftIcon={RotateCcw}
                  className="mt-1"
                  isLoading={revert.isPending && revert.variables?.code === flag.code}
                  onClick={() => revert.mutate(flag)}
                >
                  Revert to tier default
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {pending && (
        <BottomSheet
          open
          onClose={() => setPending(null)}
          title={`Turn ${pending.flag.label} ${pending.next ? 'on' : 'off'}`}
          description={`This overrides the ${org?.tier} tier default of ${pending.flag.tierDefault ? 'on' : 'off'}.`}
          footer={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Flag}
              disabled={note.trim().length === 0}
              isLoading={apply.isPending}
              onClick={() => apply.mutate()}
            >
              Apply override
            </Button>
          }
        >
          <div className="space-y-4">
            <Input
              label="Why"
              autoFocus
              placeholder="Beta pilot church"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Input
              label="Expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <Text variant="caption" color="muted">
              An expiry date is strongly advised. Overrides without one tend to be forgotten, and the
              church keeps a feature its tier does not include.
            </Text>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
