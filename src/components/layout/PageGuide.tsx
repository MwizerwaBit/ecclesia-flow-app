/**
 * @file PageGuide.tsx
 * @description The first-visit guide for a page: a small card, not a blocking
 * tour. At most three steps (see lib/guides.ts), skippable at any point, shown
 * once per person per page, and brought back from the account menu.
 *
 * It floats above the bottom tab bar on phones and sits bottom-right on desktop,
 * so the page underneath stays usable while it is open.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useAuthStore';
import { hasSeenGuide, markGuideSeen, useGuideStore } from '@/hooks/useGuideStore';
import { guideFor } from '@/lib/guides';
import { cn } from '@/lib/cn';
import { Button, Text } from '@/components/ui';

/** Let the page paint first so the card does not fight the loading state. */
const SHOW_DELAY_MS = 700;

export function PageGuide() {
  const { pathname } = useLocation();
  const user = useCurrentUser();
  const replayRequest = useGuideStore((s) => s.replayRequest);
  const guide = guideFor(pathname);
  const guideId = guide?.id;
  const userId = user?.id;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // New page: show its guide once, if this person has not seen it.
  useEffect(() => {
    setStep(0);
    setOpen(false);
    if (!guideId || !userId || hasSeenGuide(userId, guideId)) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [guideId, userId]);

  // "Guide for this page" in the account menu.
  // The ref makes a request count once: without it, a later page's guide would
  // reopen just because an earlier request left the counter above zero.
  const handledReplay = useRef(replayRequest);
  useEffect(() => {
    if (replayRequest === handledReplay.current) return;
    handledReplay.current = replayRequest;
    if (!guideId) return;
    setStep(0);
    setOpen(true);
  }, [replayRequest, guideId]);

  const close = () => {
    if (userId && guideId) markGuideSeen(userId, guideId);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // close only reads ids that are in the dependency list below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guideId, userId]);

  if (!open || !guide) return null;

  const total = guide.steps.length;
  const current = guide.steps[step];
  const last = step === total - 1;

  return (
    <div
      role="dialog"
      aria-label="Page guide"
      className={cn(
        'fixed z-[90] inset-x-3 bottom-20 xl:inset-x-auto xl:right-6 xl:bottom-6 xl:w-96',
        'rounded-2xl border border-slate-200 bg-surface p-4 shadow-xl animate-fade-in',
        'dark:border-slate-700 dark:bg-surface-dark',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {guide.steps.map((_, i) => (
            <span key={i} className={cn('h-1.5 w-6 rounded-full', i <= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700')} />
          ))}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close the guide"
          className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div aria-live="polite">
        <Text variant="h3" className="mb-1">{current.title}</Text>
        <Text variant="body-sm" color="muted">{current.body}</Text>
      </div>

      {current.action && (
        <Link
          to={current.action.to}
          onClick={close}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
        >
          {current.action.label}
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Text variant="caption" color="muted">
          {total > 1 ? `${step + 1} of ${total}` : ''}
        </Text>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={last ? close : () => setStep(step + 1)}>
            {last ? 'Got it' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
