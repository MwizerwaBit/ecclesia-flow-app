/**
 * @file ModuleGate.tsx
 * @description Guards a route that belongs to a module.
 *
 * Three distinct outcomes, which matter because they call for different
 * responses from the person who hit them:
 *   - Module not subscribed → an upgrade conversation.
 *   - Permission missing    → ask an administrator at your own church.
 *   - Both fine             → render the screen.
 *
 * Collapsing these into one "denied" screen sends people to the wrong place.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, ShieldAlert } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Button, Card, Text } from '@/components/ui';
import { MODULE_BY_ID } from './registry';
import { useModules } from './useModules';
import type { ModuleId } from './types';

interface ModuleGateProps {
  moduleId: ModuleId;
  permission?: string;
  children: ReactNode;
}

export function ModuleGate({ moduleId, permission, children }: ModuleGateProps) {
  const { isEnabled, isLoading } = useModules();
  const { can } = useRole();
  const module = MODULE_BY_ID.get(moduleId);

  // Say nothing until the subscription is known — a flash of "not included"
  // before the real answer is worse than a blank moment.
  if (isLoading) return null;

  if (!isEnabled(moduleId)) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 animate-fade-in">
        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
            {module ? (
              <module.icon size={26} className="text-primary" aria-hidden />
            ) : (
              <Lock size={26} className="text-primary" aria-hidden />
            )}
          </div>

          <Text variant="h2" className="mb-2">
            {module?.name ?? 'This module'} is not part of your plan
          </Text>
          <Text variant="body" color="muted" className="mb-6">
            {module?.description ?? 'Your church has not subscribed to this module.'}
          </Text>

          <div className="flex flex-col gap-2">
            <Link to="/staff/settings/modules">
              <Button variant="primary" fullWidth rightIcon={ArrowRight}>
                See your modules
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" fullWidth>
                Compare plans
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (permission && !can(permission)) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 animate-fade-in">
        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warning-light">
            <ShieldAlert size={26} className="text-warning" aria-hidden />
          </div>

          <Text variant="h2" className="mb-2">
            You don&rsquo;t have access to this
          </Text>
          <Text variant="body" color="muted" className="mb-6">
            Your church has {module?.name ?? 'this module'}, but your role does not include{' '}
            <code className="text-body-sm">{permission}</code>. An administrator can grant it.
          </Text>

          <Link to="/staff/dashboard">
            <Button variant="secondary" fullWidth>
              Back to the dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
