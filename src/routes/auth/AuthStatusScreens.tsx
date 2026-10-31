/**
 * @file AuthStatusScreens.tsx
 * @description The waiting and blocked states of the auth flow.
 *
 * Grouped like ErrorScreens because they share one shape: an icon, an
 * explanation and exactly one way forward. None of them is the user's fault, and
 * none of them is written as though it were.
 */
import { type ReactNode, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Lock, MailCheck } from 'lucide-react';
import { Button, Text } from '@/components/ui';

interface StatusShellProps {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}

function StatusShell({ icon, title, description, children }: StatusShellProps) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
        {icon}
      </div>
      <Text variant="h2" className="mb-2">
        {title}
      </Text>
      <Text variant="body" color="muted" className="max-w-sm mb-8">
        {description}
      </Text>
      <div className="w-full max-w-xs">{children}</div>
    </div>
  );
}

/** Counts down from `seconds`, then allows a resend. */
function useResendCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  return { remaining, reset: () => setRemaining(seconds) };
}

export function MagicLinkSent() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? 'your inbox';
  const { remaining, reset } = useResendCountdown(45);

  return (
    <StatusShell
      icon={<MailCheck size={38} className="text-primary" aria-hidden />}
      title="Check your email"
      description={`We have sent a sign-in link to ${email}. It works once, and expires in fifteen minutes.`}
    >
      <Button variant="secondary" fullWidth disabled={remaining > 0} onClick={reset}>
        {remaining > 0 ? `Resend in ${remaining}s` : 'Send another link'}
      </Button>
      <Link to="/login">
        <Button variant="ghost" fullWidth className="mt-2">
          Use a password instead
        </Button>
      </Link>
    </StatusShell>
  );
}

export function VerificationWaiting() {
  const { remaining, reset } = useResendCountdown(60);

  return (
    <StatusShell
      icon={<MailCheck size={38} className="text-primary" aria-hidden />}
      title="Confirm your email"
      description="We have sent you a confirmation link. Once you have clicked it, your church account is ready to set up."
    >
      <Button variant="secondary" fullWidth disabled={remaining > 0} onClick={reset}>
        {remaining > 0 ? `Resend in ${remaining}s` : 'Resend confirmation'}
      </Button>
      <Text variant="caption" color="muted" className="block mt-4">
        Not arrived? Check your spam folder — confirmation mail from a new sender often lands there.
      </Text>
    </StatusShell>
  );
}

export function AccountLocked() {
  const [sent, setSent] = useState(false);

  return (
    <StatusShell
      icon={<Lock size={38} className="text-warning" aria-hidden />}
      title="Your account is locked"
      description="There were too many sign-in attempts, so we locked the account to protect it. This happens automatically and says nothing about you."
    >
      <Button variant="primary" fullWidth disabled={sent} onClick={() => setSent(true)}>
        {sent ? 'Unlock link sent' : 'Email me an unlock link'}
      </Button>
      <Link to="/contact">
        <Button variant="ghost" fullWidth className="mt-2">
          Contact support
        </Button>
      </Link>
    </StatusShell>
  );
}

export function SessionExpired() {
  const [params] = useSearchParams();
  const idleMinutes = Number(params.get('minutes'));
  const idle = params.get('reason') === 'idle' && idleMinutes > 0;
  return (
    <StatusShell
      icon={<Clock size={38} className="text-primary" aria-hidden />}
      title={idle ? 'You were signed out' : 'You were away for a while'}
      description={
        idle
          ? `There was no activity for ${idleMinutes} minutes, so we signed you out to keep your church's records safe. Nothing you saved has been lost.`
          : "We signed you out to keep your church's records safe. Nothing you saved has been lost."
      }
    >
      <Link to="/login">
        <Button variant="primary" fullWidth>
          Sign back in
        </Button>
      </Link>
    </StatusShell>
  );
}
