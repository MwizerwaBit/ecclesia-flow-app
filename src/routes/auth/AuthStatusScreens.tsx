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
import { Clock, Copy, Check, KeyRound, Lock, MailCheck, ShieldCheck } from 'lucide-react';
import { Button, Card, Input, Text } from '@/components/ui';

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
  return (
    <StatusShell
      icon={<Clock size={38} className="text-primary" aria-hidden />}
      title="You were away for a while"
      description="We signed you out to keep your church's records safe. Nothing you saved has been lost."
    >
      <Link to="/login">
        <Button variant="primary" fullWidth>
          Sign back in
        </Button>
      </Link>
    </StatusShell>
  );
}

/** Backup codes shown once at setup — the only time they are ever displayed. */
const BACKUP_CODES = [
  '4f2a-91cd',
  '7b10-33ae',
  'c8e4-20bf',
  '1d97-6a45',
  'e30b-8812',
  '9a56-cf07',
];

const MANUAL_KEY = 'JBSW Y3DP EHPK 3PXP';

export function MfaSetup() {
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'scan' | 'backup'>('scan');
  const [copied, setCopied] = useState(false);

  function copyCodes() {
    void navigator.clipboard?.writeText(BACKUP_CODES.join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (step === 'backup') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 animate-fade-in space-y-5">
        <header className="text-center">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-success-light">
            <ShieldCheck size={38} className="text-success" aria-hidden />
          </div>
          <Text variant="h2" className="mb-2">
            Two-factor is on
          </Text>
          <Text variant="body" color="muted">
            Save these backup codes somewhere safe. Each works once, and this is the only time they
            will be shown.
          </Text>
        </header>

        <Card variant="outline" padding="md">
          <div className="grid grid-cols-2 gap-2">
            {BACKUP_CODES.map((backupCode) => (
              <code
                key={backupCode}
                className="rounded bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center text-body-sm tabular-nums text-slate-700 dark:text-slate-300"
              >
                {backupCode}
              </code>
            ))}
          </div>
        </Card>

        <Button
          variant="secondary"
          fullWidth
          leftIcon={copied ? Check : Copy}
          onClick={copyCodes}
        >
          {copied ? 'Copied' : 'Copy all codes'}
        </Button>

        <Link to="/staff/dashboard">
          <Button variant="primary" size="lg" fullWidth>
            I have saved them
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 animate-fade-in space-y-5">
      <header className="text-center">
        <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-primary-light dark:bg-primary/15">
          <KeyRound size={38} className="text-primary" aria-hidden />
        </div>
        <Text variant="h2" className="mb-2">
          Set up two-factor
        </Text>
        <Text variant="body" color="muted">
          Scan this with an authenticator app, then enter the six digits it shows.
        </Text>
      </header>

      {/* QR placeholder — the real code is generated server-side per enrolment */}
      <Card padding="lg" className="flex flex-col items-center">
        <div className="grid size-40 grid-cols-7 gap-1 rounded-lg bg-white p-3">
          {Array.from({ length: 49 }).map((_, i) => (
            <div
              key={i}
              className={
                // Deterministic pattern so the placeholder does not flicker on re-render
                [0, 1, 2, 5, 6, 7, 9, 12, 14, 16, 20, 22, 25, 28, 30, 33, 36, 40, 43, 46, 48].includes(i)
                  ? 'bg-slate-900 rounded-[1px]'
                  : 'bg-transparent'
              }
            />
          ))}
        </div>

        <Text variant="label" color="muted" className="mt-5 mb-1 block">
          Or enter this key manually
        </Text>
        <code className="text-body-sm tracking-wider text-slate-600 dark:text-slate-300">
          {MANUAL_KEY}
        </code>
      </Card>

      <Input
        label="Six-digit code"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
        className="[&_input]:text-center [&_input]:text-h2 [&_input]:tracking-[0.3em] [&_input]:h-14"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={code.length !== 6}
        onClick={() => setStep('backup')}
      >
        Verify and turn on
      </Button>
    </div>
  );
}
