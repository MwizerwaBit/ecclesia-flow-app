/**
 * @file ModuleSettings.tsx
 * @description What this church has turned on, and what it could.
 *
 * Shows every module in the product, not only the subscribed ones — a church
 * that cannot see what exists cannot ask for it. Each row says plainly why it
 * is on or off, because "Analytics (unavailable)" with no reason is the kind of
 * thing that generates a support ticket.
 *
 * Core modules render without a switch rather than with a disabled one: there
 * is no decision to make, so offering a control that refuses to move is worse
 * than offering none.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Info, Lock } from 'lucide-react';
import { modulesService } from '@/services/modulesService';
import { useModules, type ResolvedModule } from '@/modules/useModules';
import { TIER_ORDER } from '@/modules/types';
import { Badge, Button, Card, Skeleton, Text } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Plain-language account of why a module is in the state it is. */
function explain(module: ResolvedModule, tier: string): string {
  switch (module.reason) {
    case 'core':
      return 'Part of every plan — this one cannot be switched off.';
    case 'tier':
      return `Included in your ${tier} plan.`;
    case 'override-on':
      return 'Switched on for your church specifically, outside your plan.';
    case 'override-off':
      return 'Switched off for your church. An administrator can turn it back on.';
    case 'tier-too-low':
      return `Available from the ${module.minTier} plan upwards.`;
  }
}

export function ModuleSettings() {
  const queryClient = useQueryClient();
  const { modules, subscription, isLoading } = useModules();

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: ResolvedModule['id']; enabled: boolean | null }) =>
      modulesService.setModule(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modules', 'subscription'] }),
  });

  const enabledCount = modules.filter((m) => m.enabled).length;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 lg:px-6 py-6 animate-fade-in space-y-5">
      <header>
        <Text variant="h1" className="mb-1">
          Modules
        </Text>
        <Text variant="body" color="muted">
          {enabledCount} of {modules.length} turned on, on the{' '}
          <span className="capitalize">{subscription.tier}</span> plan.
        </Text>
      </header>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const canUpgradeInto = module.reason === 'tier-too-low';

          return (
            <Card
              key={module.id}
              padding="md"
              variant={module.enabled ? 'elevated' : 'outline'}
              className={cn(!module.enabled && 'opacity-80')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    module.enabled
                      ? 'bg-primary-light dark:bg-primary/15 text-primary'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400',
                  )}
                >
                  <Icon size={20} aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Text variant="h3">{module.name}</Text>
                    {module.core && (
                      <Badge variant="neutral" size="sm">
                        Always on
                      </Badge>
                    )}
                    {module.reason === 'override-on' && (
                      <Badge variant="primary" size="sm">
                        Added for you
                      </Badge>
                    )}
                  </div>

                  <Text variant="body-sm" color="muted">
                    {module.description}
                  </Text>

                  <Text variant="caption" color="muted" className="flex items-center gap-1.5 mt-2">
                    {module.core ? <Lock size={12} aria-hidden /> : <Info size={12} aria-hidden />}
                    {explain(module, subscription.tier)}
                  </Text>

                  {canUpgradeInto && (
                    <Link to="/pricing">
                      <Button variant="link" size="sm" rightIcon={ArrowUpRight} className="mt-2">
                        See the {module.minTier} plan
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Core modules get no switch — there is nothing to decide. */}
                {module.core ? (
                  <Check size={20} className="text-success shrink-0 mt-2" aria-label="Always on" />
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={module.enabled}
                    aria-label={`${module.name} ${module.enabled ? 'on' : 'off'}`}
                    disabled={canUpgradeInto || toggle.isPending}
                    onClick={() =>
                      toggle.mutate({
                        id: module.id,
                        // Returning to the plan default is not the same as
                        // switching off, so turning something back on clears
                        // the override rather than pinning it.
                        enabled: module.enabled ? false : null,
                      })
                    }
                    className={cn(
                      'relative h-7 w-12 shrink-0 mt-1.5 rounded-full transition-colors duration-fast',
                      module.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600',
                      canUpgradeInto && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 size-5 rounded-full bg-white transition-transform duration-fast',
                        module.enabled ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card variant="flat" padding="md">
        <Text variant="label" color="muted" className="mb-2 block">
          How plans work
        </Text>
        <Text variant="body-sm" color="muted">
          Each plan includes everything in the plans below it:{' '}
          {TIER_ORDER.slice(1).join(' → ')}. Switching a module off does not delete anything — the
          records stay and reappear if you turn it back on.
        </Text>
      </Card>
    </div>
  );
}
