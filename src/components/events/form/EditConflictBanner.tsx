/**
 * @file EditConflictBanner.tsx
 * @description What to do when someone else saved the gathering while it was being edited.
 *
 * The first step never touches what was typed: "Reload" fetches the latest
 * version and makes it the one being edited, but the form keeps the unsaved
 * text. The second step then says which of their changes saving would
 * overwrite, and offers to take their version instead.
 *
 * On a long form the banner sits far above the Save button that was just
 * pressed, so whenever it appears or moves to its next stage it scrolls into
 * view and takes focus (a screen reader then reads it, a sighted person sees it).
 */
import { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card, Text } from '@/components/ui';
import { ErrorNotice } from '@/components/feedback/ErrorNotice';

interface EditConflictBannerProps {
  /** 'conflicted': the save was refused; 'reloaded': the latest version is loaded, the form is untouched. */
  stage: 'conflicted' | 'reloaded';
  /** Their changes that the form would overwrite when saved (names of fields). */
  overwritten: string[];
  reloading: boolean;
  reloadError: unknown;
  onReload: () => void;
  onUseLatest: () => void;
  /**
   * Changes whenever there is something new to say (for example, each time the
   * save is refused again), so the banner is brought into view again even if
   * its stage is the same as before.
   */
  attentionKey?: unknown;
}

export function EditConflictBanner({
  stage,
  overwritten,
  reloading,
  reloadError,
  onReload,
  onUseLatest,
  attentionKey,
}: EditConflictBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const banner = ref.current;
    if (!banner) return;
    banner.focus({ preventScroll: true });
    banner.scrollIntoView?.({ block: 'center' });
  }, [stage, attentionKey]);

  return (
    <Card
      ref={ref}
      tabIndex={-1}
      accent="warning"
      variant="outline"
      padding="md"
      className="space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      role="alert"
    >
      <Text variant="label" className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
        <AlertTriangle size={14} className="shrink-0 text-warning" aria-hidden /> Someone else changed this gathering while you were editing
      </Text>

      {stage === 'conflicted' ? (
        <>
          <Text variant="body-sm">
            Your changes weren’t saved. Reload to get the latest version. What you typed stays in the form.
          </Text>
          <Button type="button" variant="secondary" size="sm" leftIcon={RefreshCw} isLoading={reloading} onClick={onReload}>
            Reload
          </Button>
        </>
      ) : (
        <>
          <Text variant="body-sm">
            {overwritten.length > 0
              ? `You have the latest version now, and your changes are still in the form. Saving replaces their changes to: ${overwritten.join(', ')}.`
              : 'You have the latest version now, and your changes are still in the form. Saving won’t replace anything they changed.'}
          </Text>
          {overwritten.length > 0 && (
            <Button type="button" variant="secondary" size="sm" onClick={onUseLatest}>
              Use their version instead
            </Button>
          )}
        </>
      )}

      {reloadError ? <ErrorNotice error={reloadError} /> : null}
    </Card>
  );
}
