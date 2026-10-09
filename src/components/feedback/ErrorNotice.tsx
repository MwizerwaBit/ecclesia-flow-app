/**
 * @file ErrorNotice.tsx
 * @description The one way screens show a failed request.
 *
 * The API returns a machine-readable `code` with a human message; this turns
 * the codes people actually meet into guidance (what happened, what to do),
 * and falls back to the server's own message. In demo (mock) mode, features
 * that need the real API say so plainly instead of looking broken.
 */
import { AlertTriangle, PlugZap } from 'lucide-react';
import { ApiError } from '@/services/adapter';
import { errorMessage } from '@/lib/errors';
import { Text } from '@/components/ui';
import { cn } from '@/lib/cn';

export function ErrorNotice({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  const needsApi = error instanceof ApiError && error.code === 'requires_api';
  const Icon = needsApi ? PlugZap : AlertTriangle;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        needsApi
          ? 'border-primary/30 bg-primary-light/40 dark:bg-primary/10'
          : 'border-danger/20 bg-danger-light text-danger',
        className,
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden />
      <Text variant="body-sm" className={needsApi ? '' : 'text-danger'}>
        {errorMessage(error)}
      </Text>
    </div>
  );
}
