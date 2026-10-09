/**
 * @file WizardComplete.tsx
 * @description The end of setup — the one unambiguously celebratory screen.
 *
 * Acknowledgement rather than gamification. Someone has just put their
 * congregation into a system they did not have yesterday, and the product should
 * notice. The confetti respects prefers-reduced-motion by simply not rendering.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Share2 } from 'lucide-react';
import { Button, Card, Text } from '@/components/ui';

const NEXT_STEPS = [
  { label: 'Add the rest of your members', href: '/staff/members/add' },
  { label: 'Put this Sunday on the calendar', href: '/staff/events/new' },
  { label: 'Invite your staff', href: '/staff/team/invite' },
];

/** Deterministic per mount so pieces do not re-randomise on every render. */
function useConfetti(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        delay: (i % 10) * 0.18,
        duration: 2.6 + (i % 5) * 0.35,
        color: ['bg-primary', 'bg-accent-gold', 'bg-success', 'bg-info'][i % 4],
      })),
    [count],
  );
}

export function WizardComplete() {
  const pieces = useConfetti(24);

  return (
    <div className="relative min-h-[85vh] overflow-hidden">
      {/* Decorative only — hidden from assistive tech and from reduced-motion users */}
      <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden>
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className={`absolute top-0 size-2 rounded-sm animate-confetti-fall ${piece.color}`}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
        <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-success-light animate-scale-in">
          <Check size={46} className="text-success" strokeWidth={2.5} aria-hidden />
        </div>

        <Text variant="display" className="mb-3">
          You&rsquo;re ready
        </Text>

        <Text variant="body-lg" color="muted" className="max-w-sm mb-8">
          Your church is set up. Everything from here is just using it — and most of it takes fewer
          taps than you would expect.
        </Text>

        <div className="w-full max-w-xs space-y-2 mb-8">
          <Link to="/staff/dashboard">
            <Button variant="primary" size="lg" fullWidth rightIcon={ArrowRight}>
              Go to your dashboard
            </Button>
          </Link>
          <Link to="/staff/team/invite">
            <Button variant="secondary" fullWidth leftIcon={Share2}>
              Invite your staff
            </Button>
          </Link>
        </div>

        <Card variant="flat" padding="md" className="w-full max-w-xs text-left">
          <Text variant="label" color="muted" className="mb-2 block">
            When you have a moment
          </Text>
          <div className="space-y-1.5">
            {NEXT_STEPS.map((step) => (
              <Link
                key={step.href}
                to={step.href}
                className="flex items-center justify-between gap-2 group"
              >
                <Text variant="body-sm" className="group-hover:text-primary transition-colors">
                  {step.label}
                </Text>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-primary transition-colors shrink-0"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
