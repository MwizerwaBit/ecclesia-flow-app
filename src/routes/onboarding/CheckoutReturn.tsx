/**
 * @file CheckoutReturn.tsx
 * @description Where the payment provider sends the person back to.
 *
 * Activation is driven by the provider's webhook, which can land a few seconds
 * after the redirect, so on success this waits for the church to actually be
 * active before saving the first member/event the person entered in setup.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { billingService } from '@/services/billingService';
import { takeDrafts } from '@/lib/onboardingDrafts';
import { toast } from '@/hooks/useToastStore';
import { errorMessage } from '@/lib/errors';
import { Button, Card, Text } from '@/components/ui';
import { applyDrafts } from './applyDrafts';

const LIVE = ['active', 'trial'];
const ATTEMPTS = 20;
const WAIT_MS = 1500;

type Phase = 'waiting' | 'slow' | 'canceled';

export function CheckoutReturn({ result }: { result: 'success' | 'canceled' }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(result === 'canceled' ? 'canceled' : 'waiting');
  const [attempt, setAttempt] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (result === 'canceled') return;
    // StrictMode mounts twice in dev; the work below must run once per attempt.
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      for (let i = 0; i < ATTEMPTS && !cancelled; i++) {
        try {
          const overview = await billingService.overview();
          if (LIVE.includes(overview.orgStatus)) {
            const drafts = takeDrafts();
            if (drafts) {
              try {
                await applyDrafts(drafts);
              } catch (error) {
                toast.error(`Your church is active, but we couldn’t save your first entries: ${errorMessage(error)}`);
              }
            }
            if (!cancelled) navigate('/onboarding/complete', { replace: true });
            return;
          }
        } catch {
          /* keep waiting; a blip shouldn't end the wait */
        }
        await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      }
      if (!cancelled) setPhase('slow');
    })();
    return () => {
      cancelled = true;
      started.current = false;
    };
  }, [result, navigate, attempt]);

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex items-center justify-center px-4">
      <Card padding="lg" className="w-full max-w-md text-center">
        {phase === 'waiting' && (
          <div role="status">
            <Text variant="h2" className="mb-2">Payment received</Text>
            <Text variant="body" color="muted">Switching your church on. This takes a few seconds…</Text>
          </div>
        )}
        {phase === 'slow' && (
          <div role="status">
            <Text variant="h2" className="mb-2">Still activating</Text>
            <Text variant="body" color="muted" className="mb-6">
              Your payment went through, but activation is taking longer than usual. Nothing is lost; your setup is kept.
            </Text>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setPhase('waiting');
                setAttempt((n) => n + 1);
              }}
            >
              Check again
            </Button>
          </div>
        )}
        {phase === 'canceled' && (
          <div role="status">
            <Text variant="h2" className="mb-2">Payment wasn’t completed</Text>
            <Text variant="body" color="muted" className="mb-6">
              You weren’t charged. Choose a plan again whenever you’re ready; your setup is kept.
            </Text>
            <Link to="/onboarding/plan" replace>
              <Button variant="primary" fullWidth>Choose a plan</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
