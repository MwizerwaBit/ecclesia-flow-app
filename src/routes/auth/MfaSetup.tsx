/**
 * @file MfaSetup.tsx
 * @description Setting up two-step sign-in: scan a code with an authenticator app, enter
 * the six digits it shows, then keep the backup codes.
 *
 * The key and backup codes come from the server (POST /auth/mfa/setup) and are held in
 * this component's memory only. They are never put in the query cache or storage, and the
 * backup codes are shown on the last step and not again. The QR code is drawn in the
 * browser, so the secret is not sent to any third-party image service.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { MfaEnrolment } from '@/types';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/hooks/useAuthStore';
import { errorMessage } from '@/lib/errors';
import { homePath } from '@/lib/home';
import { Button, Card, Input, Text } from '@/components/ui';

/** "JBSWY3DPEHPK3PXP" becomes "JBSW Y3DP EHPK 3PXP", easier to type from a screen. */
const groupKey = (key: string) => key.replace(/(.{4})/g, '$1 ').trim();

export function MfaSetup() {
  const user = useAuthStore((s) => s.session?.user);
  const setMfaEnabled = useAuthStore((s) => s.setMfaEnabled);
  const alreadyOn = Boolean(user?.mfaEnabled);

  const [enrolment, setEnrolment] = useState<MfaEnrolment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [step, setStep] = useState<'scan' | 'backup'>('scan');
  const [copied, setCopied] = useState(false);

  // Asking the server for a key replaces any earlier one, so ask exactly once per visit
  // (the ref also survives development's double-mount). An account that already has
  // two-step sign-in is not offered a new key: that would switch it off.
  const requested = useRef(false);
  useEffect(() => {
    if (alreadyOn || requested.current) return;
    requested.current = true;
    authService.startMfaSetup().then(setEnrolment, (err) => setLoadError(errorMessage(err)));
  }, [alreadyOn]);

  const home = homePath(user?.role);

  async function verify() {
    setVerifying(true);
    setVerifyError(null);
    try {
      await authService.confirmMfaSetup(code);
      setMfaEnabled(true);
      setStep('backup');
    } catch (err) {
      setVerifyError(errorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  function copyCodes() {
    void navigator.clipboard?.writeText((enrolment?.backupCodes ?? []).join('\n'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (alreadyOn && step === 'scan') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 animate-fade-in space-y-5 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success-light">
          <ShieldCheck size={38} className="text-success" aria-hidden />
        </div>
        <Text variant="h2">Two-factor is already on</Text>
        <Text variant="body" color="muted">
          Your account asks for a code at every sign-in. To change it, turn it off from your account
          page first.
        </Text>
        <Link to={home}>
          <Button variant="primary" size="lg" fullWidth>
            Back to your dashboard
          </Button>
        </Link>
      </div>
    );
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
            will be shown. From your next sign-in a code is asked for.
          </Text>
        </header>

        <Card variant="outline" padding="md">
          <div className="grid grid-cols-2 gap-2">
            {(enrolment?.backupCodes ?? []).map((backupCode) => (
              <code
                key={backupCode}
                className="rounded bg-slate-100 dark:bg-slate-800 px-3 py-2 text-center text-body-sm tabular-nums text-slate-700 dark:text-slate-300"
              >
                {backupCode}
              </code>
            ))}
          </div>
        </Card>

        <Button variant="secondary" fullWidth leftIcon={copied ? Check : Copy} onClick={copyCodes}>
          {copied ? 'Copied' : 'Copy all codes'}
        </Button>

        <Link to={home}>
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

      {loadError && (
        <div role="alert">
          <Text variant="body-sm" className="text-danger text-center">
            {loadError}
          </Text>
        </div>
      )}

      {!enrolment && !loadError && (
        <Text variant="body" color="muted" className="text-center">
          Preparing your code…
        </Text>
      )}

      {enrolment && (
        <>
          <Card padding="lg" className="flex flex-col items-center">
            <div className="rounded-lg bg-white p-3">
              <QRCodeSVG value={enrolment.provisioningUri} size={168} title="Two-factor setup code" />
            </div>

            <Text variant="label" color="muted" className="mt-5 mb-1 block">
              Or enter this key manually
            </Text>
            <code className="text-body-sm tracking-wider text-slate-600 dark:text-slate-300">
              {groupKey(enrolment.secret)}
            </code>
          </Card>

          <Input
            autoComplete="one-time-code"
            label="Six-digit code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^0-9]/g, ''));
              setVerifyError(null);
            }}
            className="[&_input]:text-center [&_input]:text-h2 [&_input]:tracking-[0.3em] [&_input]:h-14"
          />

          {verifyError && (
            <div role="alert">
              <Text variant="body-sm" className="text-danger">
                {verifyError}
              </Text>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={verifying}
            disabled={code.length !== 6}
            onClick={() => void verify()}
          >
            Verify and turn on
          </Button>
        </>
      )}
    </div>
  );
}
